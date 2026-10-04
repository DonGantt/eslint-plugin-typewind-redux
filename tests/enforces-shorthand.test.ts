import { RuleTester } from 'eslint';
import rule from '../src/rules/enforces-shorthand';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('enforces-shorthand', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.px_4;`,
    `import { tw } from 'typewind-v4'; const x = tw.px_4.py_2;`,
    `import { tw } from 'typewind-v4'; const x = tw.px_4.hover(tw.py_4);`,
    `import { tw } from 'typewind-v4'; const x = tw.pt_4.pr_4.pb_4;`,
    `import { tw } from 'typewind-v4'; const x = tw.px_4.px_8.py_4;`,
    `import { tw } from 'typewind-v4'; const x = tw.gap_x_['100px'].gap_y_['30px'];`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.px_4.py_4;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.p_4;`,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.pt_2.pr_2.pb_2.pl_2;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.p_2;`,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.overflow_x_auto.overflow_y_auto;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.overflow_auto;`,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `import { tw as twx } from 'typewind-v4'; const x = twx.flex.px_4.py_4;`,
      output: `import { tw as twx } from 'typewind-v4'; const x = twx.flex.p_4;`,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.px_4.py_4.pt_4.pr_4.pb_4.pl_4;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.p_4.pt_4.pr_4.pb_4.pl_4;`,
      errors: [{ messageId: 'preferShorthand' }],
    },
  ],
});
