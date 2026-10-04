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
  ],
});
