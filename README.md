# eslint-plugin-typewind-redux

ESLint rules for [typewind](https://github.com/DonGantt/typewind) and [typewind-v4](https://github.com/DonGantt/typewind), the zero-runtime, type-safe Tailwind CSS wrapper — for projects on either Tailwind v3 (`typewind`) or Tailwind v4 (`typewind-v4`).

## Installation

```sh
npm install --save-dev eslint-plugin-typewind-redux
```

```sh
pnpm add --save-dev eslint-plugin-typewind-redux
```

```sh
yarn add --dev eslint-plugin-typewind-redux
```

```sh
bun add --dev eslint-plugin-typewind-redux
```

Requires ESLint 8+. Works with either `typewind` (Tailwind v3, reads your project's `tailwind.config.{js,cjs,mjs}` at lint time) or `typewind-v4` (Tailwind v4, reads its generated `dist/_metadata.json`) — whichever is installed. `tailwindcss` itself (v3 or v4) is used as a peer when running against `typewind`.

## Usage

### Flat config (ESLint 9+)

```js
// eslint.config.js
import twPlugin from 'eslint-plugin-typewind-redux';

export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { typewind: twPlugin },
    rules: {
      'typewind/no-grey-alias': 'error',
      'typewind/prefer-canonical-value': 'warn',
      'typewind/sort-classes': 'warn',
      'typewind/no-duplicate-classes': 'error',
      'typewind/no-contradicting-classes': 'warn',
      'typewind/enforces-shorthand': 'warn',
    },
  },
];
```

Or use the recommended config directly:

```js
import twPlugin from 'eslint-plugin-typewind-redux';

export default [twPlugin.configs.recommended];
```

### Legacy config (`.eslintrc.js`, ESLint 8)

`configs.recommended` is flat-config shaped and isn't usable through `extends` on a legacy config. Wire the rules up directly instead:

```js
// .eslintrc.js
module.exports = {
  plugins: ['typewind-redux'],
  rules: {
    'typewind-redux/no-grey-alias': 'error',
    'typewind-redux/prefer-canonical-value': 'warn',
    'typewind-redux/sort-classes': 'warn',
    'typewind-redux/no-duplicate-classes': 'error',
    'typewind-redux/no-contradicting-classes': 'warn',
    'typewind-redux/enforces-shorthand': 'warn',
  },
};
```

(The plugin key in `plugins: [...]` must match this package's name minus the `eslint-plugin-` prefix, hence `typewind-redux` rather than the shorter `typewind` flat config example above uses.)

## Rules

### `no-grey-alias`

typewind accepts both the "gray" and "grey" spellings and normalizes "grey" to "gray" internally. This rule flags "grey" usages and autofixes them to "gray", in both typed property access (`tw.bg_grey_500`) and string arguments to `tw.raw()` / `tw.variant()`. Purely syntactic — no metadata required.

### `prefer-canonical-value`

Flags an arbitrary value (`tw.gap_['12px']`) that resolves to exactly the same CSS value as an existing named utility (`tw.gap_3`), and autofixes to the named utility.

### `sort-classes`

Flags and autofixes a run of plain `tw.<prop>` accesses that isn't in Tailwind's canonical utility order (mirrors `eslint-plugin-tailwindcss`'s `classnames-order`). Doesn't reorder across a method call boundary (`.hover(...)`), an arbitrary bracket value, or a link where `?.` actually appears (reordering there could change what short-circuits at runtime).

### `no-duplicate-classes`

Flags and autofixes the same utility appearing more than once in the same unvaried chain (`tw.flex.flex`).

### `no-contradicting-classes`

Flags two different utilities that set the exact same CSS properties in the same unvaried chain (e.g. `tw.flex.grid` — both set only `display`), mirroring `eslint-plugin-tailwindcss`'s `no-contradicting-classname`. Not autofixed — which one you meant to keep is ambiguous.

### `enforces-shorthand`

Flags and autofixes a set of narrower utilities that share the same value and could collapse into one shorthand (`tw.px_4.py_4` → `tw.p_4`), mirroring `eslint-plugin-tailwindcss`'s `enforces-shorthand`. Declines to act (rather than guess) when a family has ambiguous/conflicting matches in the same chain.

## Metadata requirements

`prefer-canonical-value`, `sort-classes`, and `no-contradicting-classes` need Tailwind's resolved utility data:

- **typewind-v4 projects**: run the typewind-v4 CLI generator first (its own `postinstall` script usually does this) to produce `dist/_metadata.json`.
- **typewind (v3) projects**: no extra step — this plugin builds the equivalent data on the fly from your `tailwind.config.{js,cjs,mjs}` the first time it's needed, then caches it and rebuilds automatically if the config file's mtime changes (so a long-lived process like an IDE's ESLint server picks up config edits without needing a restart). A `tailwind.config.mjs` written as genuine ESM requires Node 20.19+/22.12+ (native `require(esm)` support) — on older Node it's silently treated the same as "no config found".

If neither data source is available, these three rules silently do nothing rather than erroring. `no-grey-alias`, `no-duplicate-classes`, and `enforces-shorthand` work regardless, since they don't need this data.

## License

MIT
