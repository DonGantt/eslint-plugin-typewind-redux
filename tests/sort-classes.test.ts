import { RuleTester } from 'eslint';
import rule from '../src/rules/sort-classes';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('sort-classes', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.justify_center;`,
    `import { tw } from 'typewind-v4'; const x = tw.flex;`,
    `import { tw } from 'typewind-v4'; const x = other.items_center.flex;`,
    // Bare utilities always sort before any variant-wrapped call — already correct.
    `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.hover(tw.bg_blue_500).focus(tw.bg_red_500);`,
    `import { tw } from 'typewind-v4'; const x = tw.items_center.children(tw.flex);`,
    // An unrecognized/unmapped variant call acts as a hard boundary (same as
    // before this fix) — nothing on either side has a peer to reorder against.
    `import { tw } from 'typewind-v4'; const x = tw.flex.sm2(tw.text_white).items_center;`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.items_center.flex;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center;`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.items_center.flex.hover(tw.justify_center.flex);`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.hover(tw.flex.justify_center);`,
      errors: [{ messageId: 'unsortedClasses' }, { messageId: 'unsortedClasses' }],
    },
    {
      code: `import { tw as twx } from 'typewind-v4'; const x = twx.items_center.flex;`,
      output: `import { tw as twx } from 'typewind-v4'; const x = twx.flex.items_center;`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // A bare utility must move BEFORE a variant-wrapped call it was written after —
    // this is the core bug: previously call boundaries were never reordered at all.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.hover(tw.flex).items_center;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.items_center.hover(tw.flex);`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // Two different variant-wrapped calls reorder relative to EACH OTHER by
    // their real canonical variant tier (hover sorts before focus).
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.focus(tw.bg_red_500).hover(tw.bg_blue_500);`,
      output: `import { tw } from 'typewind-v4'; const x = tw.hover(tw.bg_blue_500).focus(tw.bg_red_500);`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // Bare and variant-wrapped calls mixed in one chain: bares sort among
    // themselves first, then calls sort among themselves, as one combined pass.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.items_center.focus(tw.bg_red_500).flex.hover(tw.bg_blue_500);`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.hover(tw.bg_blue_500).focus(tw.bg_red_500);`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // An arbitrary-value access (`content_['...']`) is a hard boundary — each
    // side resorts independently, and the boundary's own text is untouched.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.items_center.flex.content_['"*"'].text_white.bg_blue_500;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.content_['"*"'].bg_blue_500.text_white;`,
      errors: [{ messageId: 'unsortedClasses' }, { messageId: 'unsortedClasses' }],
    },
    // A terminal `.toString()`/`.valueOf()` call is never a variant wrapper —
    // it stays fixed at the end while the bare run before it still sorts.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.items_center.flex.toString();`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.toString();`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // A 2-arg named compound variant call (`..._named(groupName, style)`)
    // resolves its tier from the base variant name, ignoring the group name.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.focus(tw.bg_red_500).group_hover_named('sidebar', tw.bg_blue_500);`,
      output: `import { tw } from 'typewind-v4'; const x = tw.group_hover_named('sidebar', tw.bg_blue_500).focus(tw.bg_red_500);`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
    // `.children(...)`/`.descendants(...)` resolve to the real `*`/`**`
    // variant tiers, which (like any variant) sort after bare utilities.
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.children(tw.flex).items_center;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.items_center.children(tw.flex);`,
      errors: [{ messageId: 'unsortedClasses' }],
    },
  ],
});
