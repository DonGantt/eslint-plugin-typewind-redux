import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { walkTwChains, splitScopes, type ASTNode } from '../utils/chain';

interface ShorthandGroup {
  narrow: string[];
  broad: string;
}

const SHORTHAND_GROUPS: ShorthandGroup[] = [
  { narrow: ['px', 'py'], broad: 'p' },
  { narrow: ['pt', 'pr', 'pb', 'pl'], broad: 'p' },
  { narrow: ['mx', 'my'], broad: 'm' },
  { narrow: ['mt', 'mr', 'mb', 'ml'], broad: 'm' },
  { narrow: ['overflow_x', 'overflow_y'], broad: 'overflow' },
  { narrow: ['gap_x', 'gap_y'], broad: 'gap' },
];

function matchFamily(propName: string, family: string): string | null {
  if (propName.endsWith('_')) return null;
  if (propName === family) return '';
  const prefix = `${family}_`;
  if (propName.startsWith(prefix)) return propName.slice(prefix.length);
  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Suggest a shorthand utility when all members of a narrower utility group share the same value (e.g. px_4 + py_4 -> p_4)',
    },
    schema: [],
    messages: {
      preferShorthand: 'Prefer "{{broad}}" over separate "{{narrow}}" utilities with the same value.',
    },
  },
  create(context) {
    let twLocalName = 'tw';

    function checkScope(scope: ASTNode[]): void {
      const claimed = new Set<ASTNode>();
      const claimedBroadNames = new Set<string>();

      for (const group of SHORTHAND_GROUPS) {
        const matchesByFamily = new Map<string, ASTNode[]>();
        for (const node of scope) {
          if (claimed.has(node)) continue;
          const name = node.property.name as string;
          for (const narrowFamily of group.narrow) {
            const suffix = matchFamily(name, narrowFamily);
            if (suffix !== null) {
              const existing = matchesByFamily.get(narrowFamily) ?? [];
              existing.push(node);
              matchesByFamily.set(narrowFamily, existing);
              break;
            }
          }
        }

        if (matchesByFamily.size !== group.narrow.length) continue;
        if ([...matchesByFamily.values()].some((nodes) => nodes.length !== 1)) continue;

        const suffixes = new Set(
          group.narrow.map((fam) => {
            const node = matchesByFamily.get(fam)![0];
            const name = node.property.name as string;
            return matchFamily(name, fam);
          })
        );
        if (suffixes.size !== 1) continue;

        const suffix = [...suffixes][0];
        const broadName = suffix ? `${group.broad}_${suffix}` : group.broad;
        if (claimedBroadNames.has(broadName)) continue;

        const narrowNodes = group.narrow.map((fam) => matchesByFamily.get(fam)![0]);
        const narrowNames = narrowNodes.map((n) => n.property.name as string);
        narrowNodes.forEach((n) => claimed.add(n));
        claimedBroadNames.add(broadName);

        context.report({
          node: narrowNodes[narrowNodes.length - 1] as unknown as Rule.Node,
          messageId: 'preferShorthand',
          data: { broad: broadName, narrow: narrowNames.join(', ') },
          fix(fixer) {
            const fixes = [];
            const [keep, ...rest] = narrowNodes;
            const keepRange = keep.property.range as [number, number] | undefined;
            if (!keepRange) return null;
            fixes.push(fixer.replaceTextRange(keepRange, broadName));

            for (const node of rest) {
              const range = node.range as [number, number] | undefined;
              const objectRange = node.object?.range as [number, number] | undefined;
              if (!range || !objectRange) return null;
              fixes.push(fixer.removeRange([objectRange[1], range[1]]));
            }
            return fixes;
          },
        });
      }
    }

    return {
      Program(node) {
        twLocalName = findTwLocalName(node as unknown as Node & { body: Node[] });
        walkTwChains(node as unknown as ASTNode, twLocalName, (items) => {
          for (const scope of splitScopes(items)) checkScope(scope);
        });
      },
    };
  },
};

export default rule;
