import { RuleTester } from 'eslint';
import rule from '../src/rules/no-duplicate-classes';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-duplicate-classes', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.flex.items_center;`,
    `import { tw } from 'typewind-v4'; const x = tw.flex.hover(tw.flex);`,
    `import { tw } from 'typewind-v4'; const x = other.flex.flex;`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.flex;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex;`,
      errors: [{ messageId: 'duplicateClass' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.flex.flex;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.flex;`,
      errors: [{ messageId: 'duplicateClass' }, { messageId: 'duplicateClass' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.flex;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center;`,
      errors: [{ messageId: 'duplicateClass' }],
    },
  ],
});
