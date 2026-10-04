import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { loadTypewindMetadata } from '../utils/metadata';
import { walkTwChains, splitRuns, type ASTNode } from '../utils/chain';

const orderMapCache = new WeakMap<object, Map<string, number>>();

function getOrderMap(classOrder: string[]): Map<string, number> {
  let map = orderMapCache.get(classOrder);
  if (!map) {
    map = new Map();
    classOrder.forEach((name, i) => map!.set(name, i));
    orderMapCache.set(classOrder, map);
  }
  return map;
}

function getClassOrderIndex(orderMap: Map<string, number>, name: string): number {
  const idx = orderMap.get(name);
  return idx === undefined ? Number.MAX_SAFE_INTEGER : idx;
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

    let twLocalName = 'tw';

    function checkRun(run: ASTNode[]): void {
      if (run.length < 2) return;
      const names = run.map((n) => n.property.name as string);
      const sorted = [...names].sort(
        (a, b) => getClassOrderIndex(orderMap, a) - getClassOrderIndex(orderMap, b)
      );
      if (names.every((n, i) => n === sorted[i])) return;

      const first = run[0];
      const last = run[run.length - 1];

      context.report({
        node: last as unknown as Rule.Node,
        messageId: 'unsortedClasses',
        fix(fixer) {
          const [start] = (first.property.range as [number, number]) ?? [];
          const [, end] = (last.range as [number, number]) ?? [];
          if (start === undefined || end === undefined) return null;
          return fixer.replaceTextRange([start, end], sorted.join('.'));
        },
      });
    }

    return {
      Program(node) {
        twLocalName = findTwLocalName(node as unknown as Node & { body: Node[] });
        walkTwChains(node as unknown as ASTNode, twLocalName, (items) => {
          for (const run of splitRuns(items)) checkRun(run);
        });
      },
    };
  },
};

export default rule;
