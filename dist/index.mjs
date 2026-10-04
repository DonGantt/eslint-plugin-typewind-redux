// src/utils/ast.ts
var KNOWN_PACKAGE_NAMES = /* @__PURE__ */ new Set(["typewind-v4", "typewind"]);
function findTwLocalName(programNode) {
  for (const stmt of programNode.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    if (typeof stmt.source.value !== "string" || !KNOWN_PACKAGE_NAMES.has(stmt.source.value)) continue;
    for (const spec of stmt.specifiers) {
      if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier" && spec.imported.name === "tw") {
        return spec.local.name;
      }
    }
  }
  return "tw";
}
var rootNameCache = /* @__PURE__ */ new WeakMap();
function rootIdentifierName(node) {
  const cached2 = rootNameCache.get(node);
  if (cached2 !== void 0) return cached2;
  let result;
  switch (node.type) {
    case "Identifier":
      result = node.name;
      break;
    case "MemberExpression":
      result = rootIdentifierName(node.object);
      break;
    case "CallExpression":
      result = rootIdentifierName(node.callee);
      break;
    case "TSNonNullExpression":
      result = rootIdentifierName(node.expression);
      break;
    default:
      result = null;
  }
  rootNameCache.set(node, result);
  return result;
}

// src/rules/no-grey-alias.ts
var GREY_PROP_PATTERN = /(^|_)grey(_|$)/;
var GREY_CLASS_PATTERN = /(^|-)grey(?=-|$)/g;
function toGrayProp(prop) {
  return prop.replace(/(^|_)grey(?=_|$)/g, "$1gray");
}
function toGrayClass(value) {
  return value.replace(GREY_CLASS_PATTERN, "$1gray");
}
var rule = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: 'Enforce the "gray" spelling over "grey" in typewind-v4 class names'
    },
    schema: [],
    messages: {
      preferGray: 'Use "gray" instead of "grey" \u2014 typewind-v4 normalizes "grey" to "gray" anyway.'
    }
  },
  create(context) {
    let twLocalName = "tw";
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
      },
      MemberExpression(node) {
        if (node.property.type !== "Identifier" || node.computed) return;
        if (!GREY_PROP_PATTERN.test(node.property.name)) return;
        if (rootIdentifierName(node) !== twLocalName) return;
        const fixedName = toGrayProp(node.property.name);
        context.report({
          node: node.property,
          messageId: "preferGray",
          fix(fixer) {
            return fixer.replaceText(node.property, fixedName);
          }
        });
      },
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        if (rootIdentifierName(node.callee) !== twLocalName) return;
        if (node.callee.property.type !== "Identifier") return;
        if (!["raw", "variant"].includes(node.callee.property.name)) return;
        for (const arg of node.arguments) {
          if (arg.type !== "Literal" || typeof arg.value !== "string") continue;
          if (!GREY_CLASS_PATTERN.test(arg.value)) continue;
          GREY_CLASS_PATTERN.lastIndex = 0;
          const fixedValue = toGrayClass(arg.value);
          context.report({
            node: arg,
            messageId: "preferGray",
            fix(fixer) {
              const quote = context.getSourceCode().getText(arg)[0];
              return fixer.replaceText(arg, `${quote}${fixedValue}${quote}`);
            }
          });
        }
      }
    };
  }
};
var no_grey_alias_default = rule;

// src/utils/metadata.ts
import * as fs2 from "fs";
import * as path2 from "path";
import { createRequire as createRequire2 } from "module";

// src/utils/v3-adapter.ts
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
var CONFIG_CANDIDATES = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs"];
var MAX_UPWARD_SEARCH_DEPTH = 10;
function findTailwindConfig(startDir) {
  let dir = startDir;
  for (let depth = 0; depth < MAX_UPWARD_SEARCH_DEPTH; depth++) {
    for (const candidate of CONFIG_CANDIDATES) {
      const configPath = path.join(dir, candidate);
      if (fs.existsSync(configPath)) return configPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function getConfigFingerprint(cwd) {
  const configPath = findTailwindConfig(cwd);
  if (!configPath) return null;
  try {
    return { configPath, mtimeMs: fs.statSync(configPath).mtimeMs };
  } catch {
    return null;
  }
}
var fmtToTypewind = (s) => s.replace(/-/g, "_").replace(/^@/, "$");
var ARBITRARY_FAMILIES = [
  "bg",
  "text",
  "border",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-x",
  "border-y",
  "border-s",
  "border-e",
  "ring",
  "ring-offset",
  "fill",
  "stroke",
  "outline",
  "caret",
  "accent",
  "decoration",
  "from",
  "via",
  "to",
  "divide",
  "placeholder",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "w",
  "h",
  "size",
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "basis",
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
  "start",
  "end",
  "font",
  "tracking",
  "leading",
  "indent",
  "text-shadow",
  "translate-x",
  "translate-y",
  "translate-z",
  "rotate",
  "rotate-x",
  "rotate-y",
  "rotate-z",
  "scale",
  "scale-x",
  "scale-y",
  "scale-z",
  "skew-x",
  "skew-y",
  "opacity",
  "shadow",
  "shadow-color",
  "drop-shadow",
  "blur",
  "brightness",
  "contrast",
  "grayscale",
  "hue-rotate",
  "invert",
  "saturate",
  "sepia",
  "backdrop-blur",
  "backdrop-brightness",
  "backdrop-contrast",
  "backdrop-grayscale",
  "backdrop-hue-rotate",
  "backdrop-invert",
  "backdrop-opacity",
  "backdrop-saturate",
  "backdrop-sepia",
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
  "rounded-ss",
  "rounded-se",
  "rounded-ee",
  "rounded-es",
  "z",
  "order",
  "grow",
  "shrink",
  "flex",
  "columns",
  "aspect",
  "grid-cols",
  "grid-rows",
  "col-start",
  "col-end",
  "col-span",
  "row-start",
  "row-end",
  "row-span",
  "scroll-m",
  "scroll-mx",
  "scroll-my",
  "scroll-mt",
  "scroll-mr",
  "scroll-mb",
  "scroll-ml",
  "scroll-ms",
  "scroll-me",
  "scroll-p",
  "scroll-px",
  "scroll-py",
  "scroll-pt",
  "scroll-pr",
  "scroll-pb",
  "scroll-pl",
  "scroll-ps",
  "scroll-pe",
  "animate",
  "duration",
  "delay",
  "ease",
  "outline-offset",
  "perspective",
  "border-spacing",
  "border-spacing-x",
  "border-spacing-y",
  "divide-x",
  "divide-y"
].map(fmtToTypewind);
function isValidIdentifier(s) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s);
}
function extractCssProperties(css) {
  const props = /* @__PURE__ */ new Set();
  const declRegex = /([a-zA-Z-]+)\s*:\s*[^;{}]+;?/g;
  let match;
  while (match = declRegex.exec(css)) {
    const prop = match[1];
    if (prop.startsWith("-")) continue;
    props.add(prop);
  }
  return [...props];
}
function normalizeToPx(value, rootFontSize) {
  const remMatch = value.trim().match(/^(-?[0-9.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * rootFontSize;
  const pxMatch = value.trim().match(/^(-?[0-9.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return null;
}
function buildV3Metadata(cwd = process.cwd()) {
  const configPath = findTailwindConfig(cwd);
  if (!configPath) return null;
  try {
    const configDir = path.dirname(configPath);
    const projectRequire = createRequire(path.join(configDir, "package.json"));
    const requireFromProject = (id) => projectRequire(projectRequire.resolve(id, { paths: [configDir] }));
    const resolveConfig = requireFromProject("tailwindcss/resolveConfig");
    const { createContext } = requireFromProject("tailwindcss/lib/lib/setupContextUtils");
    const { generateRules } = requireFromProject("tailwindcss/lib/lib/generateRules");
    const postcss = requireFromProject("postcss");
    const cacheKeysBefore = new Set(Object.keys(projectRequire.cache));
    delete projectRequire.cache[projectRequire.resolve(configPath)];
    const userConfig = projectRequire(configPath);
    for (const key of Object.keys(projectRequire.cache)) {
      if (!cacheKeysBefore.has(key) && !key.includes(`${path.sep}node_modules${path.sep}`)) {
        delete projectRequire.cache[key];
      }
    }
    const ctx = createContext(resolveConfig(userConfig.default ?? userConfig));
    const rawClassList = ctx.getClassList().filter((name) => !/[.[/()]/.test(name));
    const propToKebab = /* @__PURE__ */ new Map();
    for (const kebab of rawClassList) {
      const prop = fmtToTypewind(kebab);
      if (!isValidIdentifier(prop)) continue;
      if (!propToKebab.has(prop)) propToKebab.set(prop, kebab);
    }
    const order = ctx.getClassOrder([...propToKebab.values()]);
    const kebabToOrder = /* @__PURE__ */ new Map();
    for (const [kebab, pos] of order) {
      if (pos !== null) kebabToOrder.set(kebab, pos);
    }
    const classOrder = [...propToKebab.entries()].filter(([, kebab]) => kebabToOrder.has(kebab)).sort((a, b) => {
      const orderA = kebabToOrder.get(a[1]);
      const orderB = kebabToOrder.get(b[1]);
      return orderA < orderB ? -1 : orderA > orderB ? 1 : 0;
    }).map(([prop]) => prop);
    const rootFontSize = 16;
    const cssProperties = {};
    const valueIndex = {};
    const sortedFamilies = [...ARBITRARY_FAMILIES].sort((a, b) => b.length - a.length);
    for (const [prop, kebab] of propToKebab) {
      let root;
      try {
        const rules2 = generateRules(/* @__PURE__ */ new Set([kebab]), ctx);
        if (rules2.length === 0) continue;
        root = postcss.root();
        root.append(rules2[0][1].clone());
      } catch {
        continue;
      }
      const properties = extractCssProperties(root.toString());
      if (properties.length > 0) cssProperties[prop] = properties;
      let px = null;
      root.walkDecls((decl) => {
        if (px !== null) return;
        px = normalizeToPx(decl.value, rootFontSize);
      });
      if (px === null) continue;
      const stripped = prop.startsWith("_") ? prop.slice(1) : prop;
      const family = sortedFamilies.find((fam) => stripped === fam || stripped.startsWith(fam + "_"));
      if (!family) continue;
      const key = String(px);
      valueIndex[family] ??= {};
      const existing = valueIndex[family][key];
      if (existing === void 0 || existing.startsWith("_") && !prop.startsWith("_")) {
        valueIndex[family][key] = prop;
      }
    }
    return {
      variants: [],
      classSet: [...propToKebab.keys()],
      valueIndex,
      rootFontSize,
      classOrder,
      cssProperties
    };
  } catch {
    return null;
  }
}

// src/utils/metadata.ts
var RETRY_INTERVAL_MS = 2e3;
var V3_RECHECK_INTERVAL_MS = 2e3;
var cached;
var lastFailureAt = 0;
var cachedV3Fingerprint;
var lastV3CheckAt = 0;
function loadV4Metadata() {
  try {
    const projectRequire = createRequire2(path2.join(process.cwd(), "package.json"));
    const metaPath = projectRequire.resolve("typewind-v4/dist/_metadata.json");
    const raw = fs2.readFileSync(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function hasV3ConfigChanged() {
  if (!cachedV3Fingerprint) return false;
  const current = getConfigFingerprint(process.cwd());
  if (!current) return true;
  return current.configPath !== cachedV3Fingerprint.configPath || current.mtimeMs !== cachedV3Fingerprint.mtimeMs;
}
function loadTypewindMetadata() {
  if (cached !== void 0 && cachedV3Fingerprint) {
    const now = Date.now();
    if (now - lastV3CheckAt >= V3_RECHECK_INTERVAL_MS) {
      lastV3CheckAt = now;
      if (hasV3ConfigChanged()) {
        cached = void 0;
        cachedV3Fingerprint = void 0;
      }
    }
  }
  if (cached !== void 0) return cached;
  if (lastFailureAt !== 0 && Date.now() - lastFailureAt < RETRY_INTERVAL_MS) return null;
  const v4Result = loadV4Metadata();
  if (v4Result) {
    cached = v4Result;
    return cached;
  }
  const v3Result = buildV3Metadata();
  if (v3Result) {
    cached = v3Result;
    cachedV3Fingerprint = getConfigFingerprint(process.cwd()) ?? void 0;
    lastV3CheckAt = Date.now();
    return cached;
  }
  lastFailureAt = Date.now();
  return null;
}

// src/rules/prefer-canonical-value.ts
function normalizeToPx2(value, rootFontSize) {
  const remMatch = value.match(/^(-?[0-9.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * rootFontSize;
  const pxMatch = value.match(/^(-?[0-9.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return null;
}
var rule2 = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Suggest the canonical named utility instead of an arbitrary value that matches it exactly"
    },
    schema: [],
    messages: {
      preferCanonical: 'This arbitrary value matches the canonical class "{{canonical}}" exactly \u2014 prefer the named utility.'
    }
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata) return {};
    let twLocalName = "tw";
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
      },
      MemberExpression(node) {
        if (!node.computed) return;
        if (node.property.type !== "Literal" || typeof node.property.value !== "string") return;
        const objectNode = node.object;
        if (objectNode.type !== "MemberExpression") return;
        if (objectNode.computed) return;
        if (objectNode.property.type !== "Identifier") return;
        if (!objectNode.property.name.endsWith("_")) return;
        if (rootIdentifierName(objectNode) !== twLocalName) return;
        const family = objectNode.property.name.slice(0, -1);
        const familyIndex = metadata.valueIndex?.[family];
        if (!familyIndex) return;
        const px = normalizeToPx2(node.property.value, metadata.rootFontSize);
        if (px === null) return;
        const canonical = familyIndex[String(px)];
        if (!canonical) return;
        context.report({
          node,
          messageId: "preferCanonical",
          data: { canonical },
          fix(fixer) {
            const [propertyStart] = objectNode.property.range;
            const [, nodeEnd] = node.range;
            return fixer.replaceTextRange([propertyStart, nodeEnd], canonical);
          }
        });
      }
    };
  }
};
var prefer_canonical_value_default = rule2;

// src/utils/chain.ts
function isNode(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string";
}
function isPlainPropAccess(node) {
  return node.type === "MemberExpression" && node.computed === false && node.optional !== true && isNode(node.property) && node.property.type === "Identifier";
}
function isChainLink(node) {
  return node.type === "MemberExpression" || node.type === "CallExpression" || node.type === "TSNonNullExpression";
}
function nextChainLink(node) {
  if (node.type === "MemberExpression") return node.object;
  if (node.type === "CallExpression") return node.callee;
  if (node.type === "TSNonNullExpression") return node.expression;
  return null;
}
function collectChain(head, twLocalName) {
  const items = [];
  let cur = head;
  let nextIsCallCallee = false;
  while (cur && isChainLink(cur)) {
    items.push({ node: cur, isCallCallee: nextIsCallCallee });
    nextIsCallCallee = cur.type === "CallExpression";
    cur = nextChainLink(cur);
  }
  const isTwRoot = !!cur && cur.type === "Identifier" && cur.name === twLocalName;
  items.reverse();
  return { items, isTwRoot };
}
function walkTwChains(root, twLocalName, onChain) {
  const visited = /* @__PURE__ */ new Set();
  function walk(value) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    const node = value;
    if (isChainLink(node) && !visited.has(node)) {
      const { items, isTwRoot } = collectChain(node, twLocalName);
      items.forEach(({ node: n }) => visited.add(n));
      if (isTwRoot) onChain(items);
      for (const { node: itemNode } of items) {
        if (itemNode.type === "CallExpression") {
          for (const arg of itemNode.arguments) walk(arg);
        } else if (itemNode.type === "MemberExpression" && itemNode.computed) {
          walk(itemNode.property);
        }
      }
      return;
    }
    if (visited.has(node)) return;
    for (const key of Object.keys(node)) {
      if (key === "parent") continue;
      walk(node[key]);
    }
  }
  walk(root);
}
function splitRuns(items) {
  const runs = [];
  let run = [];
  for (const { node, isCallCallee } of items) {
    if (!isCallCallee && isPlainPropAccess(node)) {
      run.push(node);
    } else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}
function splitScopes(items) {
  const scopes = [];
  let scope = [];
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

// src/rules/sort-classes.ts
var orderMapCache = /* @__PURE__ */ new WeakMap();
function getOrderMap(classOrder) {
  let map = orderMapCache.get(classOrder);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    classOrder.forEach((name, i) => map.set(name, i));
    orderMapCache.set(classOrder, map);
  }
  return map;
}
function getClassOrderIndex(orderMap, name) {
  const idx = orderMap.get(name);
  return idx === void 0 ? Number.MAX_SAFE_INTEGER : idx;
}
var rule3 = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Sort tw. property chains into canonical Tailwind utility order"
    },
    schema: [],
    messages: {
      unsortedClasses: "This typewind chain is not in canonical Tailwind class order."
    }
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata || !metadata.classOrder) return {};
    const orderMap = getOrderMap(metadata.classOrder);
    let twLocalName = "tw";
    function checkRun(run) {
      if (run.length < 2) return;
      const names = run.map((n) => n.property.name);
      const sorted = [...names].sort(
        (a, b) => getClassOrderIndex(orderMap, a) - getClassOrderIndex(orderMap, b)
      );
      if (names.every((n, i) => n === sorted[i])) return;
      const first = run[0];
      const last = run[run.length - 1];
      context.report({
        node: last,
        messageId: "unsortedClasses",
        fix(fixer) {
          const [start] = first.property.range ?? [];
          const [, end] = last.range ?? [];
          if (start === void 0 || end === void 0) return null;
          return fixer.replaceTextRange([start, end], sorted.join("."));
        }
      });
    }
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
        walkTwChains(node, twLocalName, (items) => {
          for (const run of splitRuns(items)) checkRun(run);
        });
      }
    };
  }
};
var sort_classes_default = rule3;

// src/rules/no-duplicate-classes.ts
var rule4 = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "Disallow the same typewind utility appearing more than once in the same unvaried chain"
    },
    schema: [],
    messages: {
      duplicateClass: 'Duplicate typewind utility "{{name}}" in this chain.'
    }
  },
  create(context) {
    let twLocalName = "tw";
    function checkScope(scope) {
      const seen = /* @__PURE__ */ new Map();
      for (const node of scope) {
        const name = node.property.name;
        if (!seen.has(name)) {
          seen.set(name, node);
          continue;
        }
        context.report({
          node,
          messageId: "duplicateClass",
          data: { name },
          fix(fixer) {
            const range = node.range;
            const objectRange = node.object?.range;
            if (!range || !objectRange) return null;
            return fixer.removeRange([objectRange[1], range[1]]);
          }
        });
      }
    }
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
        walkTwChains(node, twLocalName, (items) => {
          for (const scope of splitScopes(items)) checkScope(scope);
        });
      }
    };
  }
};
var no_duplicate_classes_default = rule4;

// src/rules/no-contradicting-classes.ts
function signatureOf(cssProperties, propName) {
  const props = cssProperties[propName];
  if (!props || props.length === 0) return null;
  return [...props].sort().join(",");
}
var rule5 = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow combining typewind utilities that set the exact same CSS properties (e.g. flex and grid) in the same unvaried chain"
    },
    schema: [],
    messages: {
      contradictingClasses: 'typewind utility "{{name}}" sets the same CSS propert{{plural}} ({{properties}}) as "{{other}}" earlier in this chain \u2014 they override each other.'
    }
  },
  create(context) {
    const metadata = loadTypewindMetadata();
    if (!metadata || !metadata.cssProperties) return {};
    const cssProperties = metadata.cssProperties;
    let twLocalName = "tw";
    function checkScope(scope) {
      const seenBySignature = /* @__PURE__ */ new Map();
      for (const node of scope) {
        const name = node.property.name;
        const signature = signatureOf(cssProperties, name);
        if (signature === null) continue;
        const prior = seenBySignature.get(signature);
        if (prior && prior.name !== name) {
          const properties = cssProperties[name];
          context.report({
            node,
            messageId: "contradictingClasses",
            data: {
              name,
              other: prior.name,
              properties: properties.join(", "),
              plural: properties.length > 1 ? "ies" : "y"
            }
          });
        }
        seenBySignature.set(signature, { name, node });
      }
    }
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
        walkTwChains(node, twLocalName, (items) => {
          for (const scope of splitScopes(items)) checkScope(scope);
        });
      }
    };
  }
};
var no_contradicting_classes_default = rule5;

// src/rules/enforces-shorthand.ts
var SHORTHAND_GROUPS = [
  { narrow: ["px", "py"], broad: "p" },
  { narrow: ["pt", "pr", "pb", "pl"], broad: "p" },
  { narrow: ["mx", "my"], broad: "m" },
  { narrow: ["mt", "mr", "mb", "ml"], broad: "m" },
  { narrow: ["overflow_x", "overflow_y"], broad: "overflow" },
  { narrow: ["gap_x", "gap_y"], broad: "gap" }
];
function matchFamily(propName, family) {
  if (propName.endsWith("_")) return null;
  if (propName === family) return "";
  const prefix = `${family}_`;
  if (propName.startsWith(prefix)) return propName.slice(prefix.length);
  return null;
}
var rule6 = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Suggest a shorthand utility when all members of a narrower utility group share the same value (e.g. px_4 + py_4 -> p_4)"
    },
    schema: [],
    messages: {
      preferShorthand: 'Prefer "{{broad}}" over separate "{{narrow}}" utilities with the same value.'
    }
  },
  create(context) {
    let twLocalName = "tw";
    function checkScope(scope) {
      const claimed = /* @__PURE__ */ new Set();
      const claimedBroadNames = /* @__PURE__ */ new Set();
      for (const group of SHORTHAND_GROUPS) {
        const matchesByFamily = /* @__PURE__ */ new Map();
        for (const node of scope) {
          if (claimed.has(node)) continue;
          const name = node.property.name;
          for (const narrowFamily of group.narrow) {
            const suffix2 = matchFamily(name, narrowFamily);
            if (suffix2 !== null) {
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
            const node = matchesByFamily.get(fam)[0];
            const name = node.property.name;
            return matchFamily(name, fam);
          })
        );
        if (suffixes.size !== 1) continue;
        const suffix = [...suffixes][0];
        const broadName = suffix ? `${group.broad}_${suffix}` : group.broad;
        if (claimedBroadNames.has(broadName)) continue;
        const narrowNodes = group.narrow.map((fam) => matchesByFamily.get(fam)[0]);
        const narrowNames = narrowNodes.map((n) => n.property.name);
        narrowNodes.forEach((n) => claimed.add(n));
        claimedBroadNames.add(broadName);
        context.report({
          node: narrowNodes[narrowNodes.length - 1],
          messageId: "preferShorthand",
          data: { broad: broadName, narrow: narrowNames.join(", ") },
          fix(fixer) {
            const fixes = [];
            const [keep, ...rest] = narrowNodes;
            const keepRange = keep.property.range;
            if (!keepRange) return null;
            fixes.push(fixer.replaceTextRange(keepRange, broadName));
            for (const node of rest) {
              const range = node.range;
              const objectRange = node.object?.range;
              if (!range || !objectRange) return null;
              fixes.push(fixer.removeRange([objectRange[1], range[1]]));
            }
            return fixes;
          }
        });
      }
    }
    return {
      Program(node) {
        twLocalName = findTwLocalName(node);
        walkTwChains(node, twLocalName, (items) => {
          for (const scope of splitScopes(items)) checkScope(scope);
        });
      }
    };
  }
};
var enforces_shorthand_default = rule6;

// src/index.ts
var plugin = {
  rules: {
    "no-grey-alias": no_grey_alias_default,
    "prefer-canonical-value": prefer_canonical_value_default,
    "sort-classes": sort_classes_default,
    "no-duplicate-classes": no_duplicate_classes_default,
    "no-contradicting-classes": no_contradicting_classes_default,
    "enforces-shorthand": enforces_shorthand_default
  },
  configs: {}
};
plugin.configs.recommended = {
  plugins: { "typewind-v4": plugin },
  rules: {
    "typewind-v4/no-grey-alias": "error",
    "typewind-v4/prefer-canonical-value": "warn",
    "typewind-v4/sort-classes": "warn",
    "typewind-v4/no-duplicate-classes": "error",
    "typewind-v4/no-contradicting-classes": "warn",
    "typewind-v4/enforces-shorthand": "warn"
  }
};
var { rules, configs } = plugin;
var index_default = plugin;
export {
  configs,
  index_default as default,
  rules
};
