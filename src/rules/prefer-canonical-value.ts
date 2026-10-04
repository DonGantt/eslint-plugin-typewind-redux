import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName, rootIdentifierName } from '../utils/ast';
import { loadTypewindMetadata } from '../utils/metadata';

function normalizeToPx(value: string, rootFontSize: number): number | null {
  const remMatch = value.match(/^(-?[0-9.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * rootFontSize;

  const pxMatch = value.match(/^(-?[0-9.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);

  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Suggest the canonical named utility instead of an arbitrary value that matches it exactly',
    },
    schema: [],
    messages: {
      preferCanonical:
        'This arbitrary value matches the canonical class "{{canonical}}" exactly — prefer the named utility.',
    },
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata) return {};

    let twLocalName = 'tw';

    return {
      Program(node) {
        twLocalName = findTwLocalName(node as unknown as Node & { body: Node[] });
      },

      MemberExpression(node) {
        if (!node.computed) return;
        if (node.property.type !== 'Literal' || typeof node.property.value !== 'string') return;

        const objectNode = node.object;
        if (objectNode.type !== 'MemberExpression') return;
        if (objectNode.computed) return;
        if (objectNode.property.type !== 'Identifier') return;
        if (!objectNode.property.name.endsWith('_')) return;

        if (rootIdentifierName(objectNode as unknown as Node) !== twLocalName) return;

        const family = objectNode.property.name.slice(0, -1);
        const familyIndex = metadata.valueIndex?.[family];
        if (!familyIndex) return;

        const px = normalizeToPx(node.property.value, metadata.rootFontSize);
        if (px === null) return;

        const canonical = familyIndex[String(px)];
        if (!canonical) return;

        context.report({
          node: node as unknown as Rule.Node,
          messageId: 'preferCanonical',
          data: { canonical },
          fix(fixer) {
            const [propertyStart] = objectNode.property.range as [number, number];
            const [, nodeEnd] = node.range as [number, number];
            return fixer.replaceTextRange([propertyStart, nodeEnd], canonical);
          },
        });
      },
    };
  },
};

export default rule;
