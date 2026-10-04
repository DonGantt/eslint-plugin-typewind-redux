import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { walkTwChains, splitScopes, type ASTNode } from '../utils/chain';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Disallow the same typewind utility appearing more than once in the same unvaried chain',
    },
    schema: [],
    messages: {
      duplicateClass: 'Duplicate typewind utility "{{name}}" in this chain.',
    },
  },
  create(context) {
    let twLocalName = 'tw';

    function checkScope(scope: ASTNode[]): void {
      const seen = new Map<string, ASTNode>();

      for (const node of scope) {
        const name = node.property.name as string;
        if (!seen.has(name)) {
          seen.set(name, node);
          continue;
        }

        context.report({
          node: node as unknown as Rule.Node,
          messageId: 'duplicateClass',
          data: { name },
          fix(fixer) {
            const range = node.range as [number, number] | undefined;
            const objectRange = node.object?.range as [number, number] | undefined;
            if (!range || !objectRange) return null;
            return fixer.removeRange([objectRange[1], range[1]]);
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
