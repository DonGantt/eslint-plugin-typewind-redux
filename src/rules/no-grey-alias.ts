import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName, rootIdentifierName } from '../utils/ast';

const GREY_PROP_PATTERN = /(^|_)grey(_|$)/;
const GREY_CLASS_PATTERN = /(^|-)grey(?=-|$)/g;

function toGrayProp(prop: string): string {
  return prop.replace(/(^|_)grey(?=_|$)/g, '$1gray');
}

function toGrayClass(value: string): string {
  return value.replace(GREY_CLASS_PATTERN, '$1gray');
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Enforce the "gray" spelling over "grey" in typewind-v4 class names',
    },
    schema: [],
    messages: {
      preferGray: 'Use "gray" instead of "grey" — typewind-v4 normalizes "grey" to "gray" anyway.',
    },
  },
  create(context) {
    let twLocalName = 'tw';

    return {
      Program(node) {
        twLocalName = findTwLocalName(node as unknown as Node & { body: Node[] });
      },

      MemberExpression(node) {
        if (node.property.type !== 'Identifier' || node.computed) return;
        if (!GREY_PROP_PATTERN.test(node.property.name)) return;
        if (rootIdentifierName(node as unknown as Node) !== twLocalName) return;

        const fixedName = toGrayProp(node.property.name);
        context.report({
          node: node.property as unknown as Rule.Node,
          messageId: 'preferGray',
          fix(fixer) {
            return fixer.replaceText(node.property as unknown as Rule.Node, fixedName);
          },
        });
      },

      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (rootIdentifierName(node.callee as unknown as Node) !== twLocalName) return;
        if (node.callee.property.type !== 'Identifier') return;
        if (!['raw', 'variant'].includes(node.callee.property.name)) return;

        for (const arg of node.arguments) {
          if (arg.type !== 'Literal' || typeof arg.value !== 'string') continue;
          if (!GREY_CLASS_PATTERN.test(arg.value)) continue;
          GREY_CLASS_PATTERN.lastIndex = 0;

          const fixedValue = toGrayClass(arg.value);
          context.report({
            node: arg as unknown as Rule.Node,
            messageId: 'preferGray',
            fix(fixer) {
              const quote = context.getSourceCode().getText(arg as unknown as Rule.Node)[0];
              return fixer.replaceText(arg as unknown as Rule.Node, `${quote}${fixedValue}${quote}`);
            },
          });
        }
      },
    };
  },
};

export default rule;
