export interface ASTNode {
  type: string;
  [key: string]: any;
}

export function isNode(value: unknown): value is ASTNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ASTNode).type === 'string'
  );
}

export function isPlainPropAccess(node: ASTNode): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.computed === false &&
    node.optional !== true &&
    isNode(node.property) &&
    node.property.type === 'Identifier'
  );
}

export function isChainLink(node: ASTNode): boolean {
  return (
    node.type === 'MemberExpression' ||
    node.type === 'CallExpression' ||
    node.type === 'TSNonNullExpression'
  );
}

function nextChainLink(node: ASTNode): ASTNode | null {
  if (node.type === 'MemberExpression') return node.object;
  if (node.type === 'CallExpression') return node.callee;
  if (node.type === 'TSNonNullExpression') return node.expression;
  return null;
}

export interface ChainItem {
  node: ASTNode;
  isCallCallee: boolean;
}

export interface ChainResult {
  items: ChainItem[];
  isTwRoot: boolean;
  root: ASTNode | null;
}

export function collectChain(head: ASTNode, twLocalName: string): ChainResult {
  const items: ChainItem[] = [];
  let cur: ASTNode | null = head;
  let nextIsCallCallee = false;

  while (cur && isChainLink(cur)) {
    items.push({ node: cur, isCallCallee: nextIsCallCallee });
    nextIsCallCallee = cur.type === 'CallExpression';
    cur = nextChainLink(cur);
  }

  const isTwRoot = !!cur && cur.type === 'Identifier' && cur.name === twLocalName;
  items.reverse();
  return { items, isTwRoot, root: cur };
}

export function walkTwChains(
  root: ASTNode,
  twLocalName: string,
  onChain: (items: ChainItem[], chainRoot: ASTNode | null) => void
): void {
  const visited = new Set<ASTNode>();

  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    const node = value;

    if (isChainLink(node) && !visited.has(node)) {
      const { items, isTwRoot, root: chainRoot } = collectChain(node, twLocalName);
      items.forEach(({ node: n }) => visited.add(n));

      if (isTwRoot) onChain(items, chainRoot);

      for (const { node: itemNode } of items) {
        if (itemNode.type === 'CallExpression') {
          for (const arg of itemNode.arguments) walk(arg);
        } else if (itemNode.type === 'MemberExpression' && itemNode.computed) {
          walk(itemNode.property);
        }
      }
      return;
    }

    if (visited.has(node)) return;
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      walk(node[key]);
    }
  }

  walk(root);
}

export function splitScopes(items: ChainItem[]): ASTNode[][] {
  const scopes: ASTNode[][] = [];
  let scope: ASTNode[] = [];

  for (const { node, isCallCallee } of items) {
    if (isCallCallee) {
      if (scope.length > 0) scopes.push(scope);
      scope = [];
      continue;
    }
    if (isPlainPropAccess(node)) scope.push(node);
  }
  if (scope.length > 0) scopes.push(scope);

  return scopes;
}
