import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { loadTypewindMetadata } from '../utils/metadata';
import { walkTwChains, splitScopes, type ASTNode } from '../utils/chain';

function signatureOf(cssProperties: Record<string, string[]>, propName: string): string | null {
  const props = cssProperties[propName];
  if (!props || props.length === 0) return null;
  return [...props].sort().join(',');
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow combining typewind utilities that set the exact same CSS properties (e.g. flex and grid) in the same unvaried chain',
    },
    schema: [],
    messages: {
      contradictingClasses:
        'typewind utility "{{name}}" sets the same CSS propert{{plural}} ({{properties}}) as "{{other}}" earlier in this chain — they override each other.',
    },
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata || !metadata.cssProperties) return {};
    const cssProperties = metadata.cssProperties;

    let twLocalName = 'tw';

    function checkScope(scope: ASTNode[]): void {
      const seenBySignature = new Map<string, { name: string; node: ASTNode }>();

      for (const node of scope) {
        const name = node.property.name as string;
        const signature = signatureOf(cssProperties, name);
        if (signature === null) continue;

        const prior = seenBySignature.get(signature);
        if (prior && prior.name !== name) {
          const properties = cssProperties[name];
          context.report({
            node: node as unknown as Rule.Node,
            messageId: 'contradictingClasses',
            data: {
              name,
              other: prior.name,
              properties: properties.join(', '),
              plural: properties.length > 1 ? 'ies' : 'y',
            },
          });
        }

        seenBySignature.set(signature, { name, node });
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
