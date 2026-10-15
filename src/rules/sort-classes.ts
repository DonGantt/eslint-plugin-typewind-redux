import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { loadTypewindMetadata } from '../utils/metadata';
import {
  walkTwChains,
  isPlainPropAccess,
  isChainLink,
  collectChain,
  type ASTNode,
  type ChainItem,
} from '../utils/chain';

const orderMapCache = new WeakMap<object, Map<string, number>>();

function getOrderMap(order: string[]): Map<string, number> {
  let map = orderMapCache.get(order);
  if (!map) {
    map = new Map();
    order.forEach((name, i) => map!.set(name, i));
    orderMapCache.set(order, map);
  }
  return map;
}

// Real Tailwind v4 class order factors into (variant tier, base utility
// order) — verified against the real engine. A bare (unvaried) utility is
// always tier -1 (sorts before every variant); a call-wrapped utility's tier
// comes from `variantOrder`. Units we can't confidently classify (arbitrary
// values, unknown/async calls, non-null assertions, a terminal `.toString()`)
// are 'boundary': never reordered, and they split the chain into
// independently-sortable runs, exactly like the old call-boundary behavior.
const NEGATIVE_SENTINEL = -1;

interface Unit {
  nodes: ASTNode[];
  kind: 'bare' | 'call' | 'boundary';
  tier: number;
  order: number;
  // Each node's `.range` spans from the START OF THE WHOLE CHAIN EXPRESSION
  // through that node's own end (AST ranges for a link mid-chain are never
  // self-contained) — so a unit's own isolated source slice has to be
  // computed by threading the end offset of whatever immediately precedes it
  // through the whole items list, not read off any single node's range.
  start: number;
  end: number;
}

const fmtToTailwind = (s: string) =>
  s.replace(/__/g, '.').replace(/_/g, '-').replace(/^\$/, '@').replace(/\$/, '/');

function isComputedBracket(node: ASTNode): boolean {
  return node.type === 'MemberExpression' && node.computed === true;
}

// Multiple calls can share the exact same variant (e.g. two separate
// `.hover(...)` calls, or `.hover(tw.A)` next to `.hover(tw.B)`) — ties on
// tier alone would just preserve whatever order they happened to be written
// in, which doesn't match the real engine (same-tier items still sort by
// their own base utility order). Use the first bare class reachable inside
// the call's argument as that representative order.
function firstBareOrderOf(
  argNode: ASTNode | undefined,
  twLocalName: string,
  orderMap: Map<string, number>
): number {
  if (!argNode || !isChainLink(argNode)) return Number.MAX_SAFE_INTEGER;
  const { items, isTwRoot } = collectChain(argNode, twLocalName);
  const first = items[0];
  if (!isTwRoot || !first || first.isCallCallee || !isPlainPropAccess(first.node)) {
    return Number.MAX_SAFE_INTEGER;
  }
  const name = (first.node.property.name as string).replace(/\$$/, '');
  return orderMap.get(name) ?? Number.MAX_SAFE_INTEGER;
}

function buildUnits(
  items: ChainItem[],
  chainStart: number,
  twLocalName: string,
  orderMap: Map<string, number>,
  variantOrderMap: Map<string, number> | null
): Unit[] {
  const units: Unit[] = [];
  let i = 0;
  let prevEnd = chainStart;

  const push = (nodes: ASTNode[], kind: Unit['kind'], tier: number, order: number) => {
    const end = (nodes[nodes.length - 1].range as [number, number])[1];
    units.push({ nodes, kind, tier, order, start: prevEnd, end });
    prevEnd = end;
  };

  while (i < items.length) {
    const cur = items[i];
    const node = cur.node;

    // A variant-wrapper call: the callee member (about to be invoked)
    // followed immediately by its CallExpression.
    if (cur.isCallCallee && isPlainPropAccess(node)) {
      const callNode = items[i + 1]?.node;
      if (callNode && callNode.type === 'CallExpression') {
        const propName = node.property.name as string;
        const args = (callNode.arguments as ASTNode[]) ?? [];

        if (args.length === 0 && (propName === 'toString' || propName === 'valueOf')) {
          push([node, callNode], 'boundary', 0, 0);
          i += 2;
          continue;
        }

        let variantKey: string | null = null;
        if (propName === 'children') variantKey = '*';
        else if (propName === 'descendants') variantKey = '**';
        else if (propName.endsWith('_named') && args.length === 2) {
          variantKey = fmtToTailwind(propName.slice(0, -'_named'.length));
        } else if (args.length === 1) {
          variantKey = fmtToTailwind(propName);
        }

        const tier = variantKey !== null ? variantOrderMap?.get(variantKey) : undefined;
        if (tier !== undefined) {
          const styleArg = args[args.length - 1];
          const order = firstBareOrderOf(styleArg, twLocalName, orderMap);
          push([node, callNode], 'call', tier, order);
        } else {
          push([node, callNode], 'boundary', 0, 0);
        }
        i += 2;
        continue;
      }
    }

    // A bare named utility — unless immediately followed by a computed
    // bracket, which must stay glued to its prefix marker prop rather than
    // being sorted independently. Two distinct conventions produce this
    // shape: a true arbitrary value (`content_['"*"']`, prop ends in "_")
    // has no classOrder entry of its own and must stay an immovable
    // boundary; an opacity/value modifier on a named class (`bg_accent$
    // ['10']`, prop ends in "$") resolves to the SAME classOrder position as
    // its bare base class — verified against the real engine: opacity is
    // layered via CSS variables and never changes a utility's category/tier,
    // true for custom theme colors and the built-in palette alike — so it's
    // sortable, not a boundary.
    if (!cur.isCallCallee && isPlainPropAccess(node)) {
      const next = items[i + 1];
      if (next && !next.isCallCallee && isComputedBracket(next.node)) {
        const propName = node.property.name as string;
        if (propName.endsWith('$')) {
          const order = orderMap.get(propName.slice(0, -1));
          if (order !== undefined) {
            push([node, next.node], 'bare', NEGATIVE_SENTINEL, order);
            i += 2;
            continue;
          }
        }
        push([node, next.node], 'boundary', 0, 0);
        i += 2;
        continue;
      }

      const name = node.property.name as string;
      const order = orderMap.get(name);
      push([node], 'bare', NEGATIVE_SENTINEL, order ?? Number.MAX_SAFE_INTEGER);
      i += 1;
      continue;
    }

    push([node], 'boundary', 0, 0);
    i += 1;
  }

  return units;
}

function compareUnits(a: Unit, b: Unit): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return a.order - b.order;
}

// A call unit's own verbatim source text may contain a NESTED tw-chain (its
// last argument, by typewind's own calling convention) that also needs
// reordering. ESLint applies only one of two overlapping-range fixes per
// pass, so an outer run's fix must already embed the nested chain's
// corrected text rather than copying its stale original — otherwise the
// inner chain's own (now-redundant, discarded) fix would be the only thing
// that ever reorders it, and it never would be in a single `--fix` pass.
function unitText(
  u: Unit,
  text: string,
  twLocalName: string,
  orderMap: Map<string, number>,
  variantOrderMap: Map<string, number> | null
): string {
  const lastNode = u.nodes[u.nodes.length - 1];
  if (lastNode.type === 'CallExpression') {
    const args = (lastNode.arguments as ASTNode[]) ?? [];
    const lastArg = args[args.length - 1];
    if (lastArg && isChainLink(lastArg)) {
      const inner = collectChain(lastArg, twLocalName);
      if (inner.isTwRoot && inner.root) {
        const innerChainStart = (inner.root.range as [number, number])[1];
        const innerText = computeChainText(
          inner.items,
          innerChainStart,
          text,
          twLocalName,
          orderMap,
          variantOrderMap
        );
        const [, argEnd] = lastArg.range as [number, number];
        return text.slice(u.start, innerChainStart) + innerText + text.slice(argEnd, u.end);
      }
    }
  }
  return text.slice(u.start, u.end);
}

// Reassembles the full text for a chain (or any nested chain reached via
// `unitText`'s recursion): each run of sortable units is stable-sorted and
// rejoined, boundary units are left exactly where they were.
function computeChainText(
  items: ChainItem[],
  chainStart: number,
  text: string,
  twLocalName: string,
  orderMap: Map<string, number>,
  variantOrderMap: Map<string, number> | null
): string {
  const units = buildUnits(items, chainStart, twLocalName, orderMap, variantOrderMap);
  const pieces: string[] = [];
  let run: Unit[] = [];

  const flushRun = () => {
    const sorted = [...run].sort(compareUnits);
    for (const u of sorted) pieces.push(unitText(u, text, twLocalName, orderMap, variantOrderMap));
    run = [];
  };

  for (const u of units) {
    if (u.kind === 'boundary') {
      flushRun();
      pieces.push(unitText(u, text, twLocalName, orderMap, variantOrderMap));
      continue;
    }
    run.push(u);
  }
  flushRun();

  return pieces.join('');
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Sort tw. property chains into canonical Tailwind utility order',
    },
    schema: [],
    messages: {
      unsortedClasses: 'This typewind chain is not in canonical Tailwind class order.',
    },
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata || !metadata.classOrder) return {};
    const orderMap = getOrderMap(metadata.classOrder);
    const variantOrderMap = metadata.variantOrder ? getOrderMap(metadata.variantOrder) : null;
    const sourceCode = context.getSourceCode();

    let twLocalName = 'tw';

    function checkRun(run: Unit[]): void {
      if (run.length < 2) return;
      const sorted = [...run].sort(compareUnits);
      if (run.every((u, i) => u === sorted[i])) return;

      const start = run[0].start;
      const end = run[run.length - 1].end;
      const lastNode = run[run.length - 1].nodes[run[run.length - 1].nodes.length - 1];

      context.report({
        node: lastNode as unknown as Rule.Node,
        messageId: 'unsortedClasses',
        fix(fixer) {
          const text = sourceCode.getText();
          const replacement = sorted
            .map((u) => unitText(u, text, twLocalName, orderMap, variantOrderMap))
            .join('');
          return fixer.replaceTextRange([start, end], replacement);
        },
      });
    }

    return {
      Program(node) {
        twLocalName = findTwLocalName(node as unknown as Node & { body: Node[] });
        walkTwChains(node as unknown as ASTNode, twLocalName, (items, chainRoot) => {
          const chainStart = (chainRoot?.range as [number, number] | undefined)?.[1];
          if (chainStart === undefined) return;
          const units = buildUnits(items, chainStart, twLocalName, orderMap, variantOrderMap);
          let run: Unit[] = [];
          for (const u of units) {
            if (u.kind === 'boundary') {
              checkRun(run);
              run = [];
              continue;
            }
            run.push(u);
          }
          checkRun(run);
        });
      },
    };
  },
};

export default rule;
