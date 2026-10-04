import { RuleTester } from 'eslint';
import rule from '../src/rules/no-contradicting-classes';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-contradicting-classes', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.flex.items_center;`,
    `import { tw } from 'typewind-v4'; const x = tw.flex.hover(tw.grid);`,
    `import { tw } from 'typewind-v4'; const x = tw.p_4.px_2;`,
    `import { tw } from 'typewind-v4'; const x = tw.flex.flex;`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.grid;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.absolute.relative;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.items_center.grid;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.flex.grid.flex;`,
      errors: [{ messageId: 'contradictingClasses' }, { messageId: 'contradictingClasses' }],
    },
  ],
});
