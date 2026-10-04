import type { Node } from 'estree';

const KNOWN_PACKAGE_NAMES = new Set(['typewind-v4', 'typewind']);

export function findTwLocalName(programNode: Node & { body: Node[] }): string {
  for (const stmt of programNode.body) {
    if (stmt.type !== 'ImportDeclaration') continue;
    if (typeof stmt.source.value !== 'string' || !KNOWN_PACKAGE_NAMES.has(stmt.source.value)) continue;
    for (const spec of stmt.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier' && spec.imported.name === 'tw') {
        return spec.local.name;
      }
    }
  }
  return 'tw';
}

const rootNameCache = new WeakMap<Node, string | null>();

export function rootIdentifierName(node: Node): string | null {
  const cached = rootNameCache.get(node);
  if (cached !== undefined) return cached;

  let result: string | null;
  switch (node.type as string) {
    case 'Identifier':
      result = (node as Node & { type: 'Identifier' }).name;
      break;
    case 'MemberExpression':
      result = rootIdentifierName((node as Node & { type: 'MemberExpression' }).object as Node);
      break;
    case 'CallExpression':
      result = rootIdentifierName((node as Node & { type: 'CallExpression' }).callee as Node);
      break;
    case 'TSNonNullExpression':
      result = rootIdentifierName((node as unknown as { expression: Node }).expression);
      break;
    default:
      result = null;
  }

  rootNameCache.set(node, result);
  return result;
}
