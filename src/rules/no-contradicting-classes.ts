import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { findTwLocalName } from '../utils/ast';
import { loadTypewindMetadata } from '../utils/metadata';
import { walkTwChains, splitScopes, type ASTNode } from '../utils/chain';

// divide-* applies border-color/border-width to a child combinator
// (`> :not(:last-child)`), not to the element itself, so it shares a raw CSS
// property name with border-* without actually contradicting it. Scoping the
// signature by family keeps divide-vs-divide and border-vs-border comparable
// to themselves while never colliding with each other.
function isDivideProp(n: string): boolean {
  return n === 'divide' || n.startsWith('divide_');
}

// translate-x/y/z, rotate-x/y/z, skew-x/y, and scale-x/y/z are each one axis
// of a shared composite property (translate, transform, scale respectively —
// Tailwind v4 composes them via separate --tw-* channel variables), so e.g.
// translate-x and translate-y never contradict even though they reduce to
// the same raw CSS property. Scoping by family+axis instead of by raw
// property keeps same-axis utilities (two different translate-x values)
// correctly comparable to each other while never colliding across axes.
const AXIS_FAMILY_PATTERN = /^(translate|rotate|scale|skew)_([xyz])(_|$)/;

// Bare (axis-less) scale/skew/translate set every one of these channels at
// once (confirmed against real Tailwind output: scale-50 sets --tw-scale-x/
// y/z, skew-12 sets --tw-skew-x/y, translate-4 sets --tw-translate-x/y), so
// e.g. scale_50 must be comparable to scale_x_75 even though only one of
// them matches AXIS_FAMILY_PATTERN directly. rotate has no such bare form —
// bare rotate-N sets a separate "rotate" property untouched by rotate-x/y/z.
const UNIFORM_AXIS_FAMILIES: Record<string, string[]> = {
  scale: ['x', 'y', 'z'],
  skew: ['x', 'y'],
  translate: ['x', 'y'],
};

function signaturesOf(cssProperties: Record<string, string[]>, propName: string): string[] {
  const axisMatch = propName.match(AXIS_FAMILY_PATTERN);
  if (axisMatch) return [`axis:${axisMatch[1]}:${axisMatch[2]}`];

  for (const [family, axes] of Object.entries(UNIFORM_AXIS_FAMILIES)) {
    if (propName === family || propName.startsWith(`${family}_`)) {
      return axes.map((axis) => `axis:${family}:${axis}`);
    }
  }

  const props = cssProperties[propName];
  if (!props || props.length === 0) return [];
  const scope = isDivideProp(propName) ? 'divide:' : '';
  return [scope + [...props].sort().join(',')];
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
        const signatures = signaturesOf(cssProperties, name);
        if (signatures.length === 0) continue;

        // A node can carry multiple signatures (e.g. bare scale_50 touches
        // the x/y/z channels at once) — report at most once per node even
        // if it collides with a prior node on more than one of them.
        let reported = false;
        for (const signature of signatures) {
          const prior = seenBySignature.get(signature);
          if (prior && prior.name !== name) {
            if (!reported) {
              const properties = cssProperties[name] ?? [];
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
              reported = true;
            }
          }
        }

        for (const signature of signatures) {
          seenBySignature.set(signature, { name, node });
        }
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
