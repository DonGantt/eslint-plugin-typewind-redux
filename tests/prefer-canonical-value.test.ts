import { RuleTester } from 'eslint';
import rule from '../src/rules/prefer-canonical-value';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-canonical-value', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.gap_3;`,
    `import { tw } from 'typewind-v4'; const x = tw.gap_['17px'];`,
    `import { tw } from 'typewind-v4'; const x = tw.gap_['1.5em'];`,
    `import { tw } from 'typewind-v4'; const x = other.gap_['12px'];`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.gap_['12px'];`,
      output: `import { tw } from 'typewind-v4'; const x = tw.gap_3;`,
      errors: [{ messageId: 'preferCanonical' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.top_['-8px'];`,
      output: `import { tw } from 'typewind-v4'; const x = tw._top_2;`,
      errors: [{ messageId: 'preferCanonical' }],
    },
    {
      code: `import { tw as twx } from 'typewind-v4'; const x = twx.gap_['0.75rem'];`,
      output: `import { tw as twx } from 'typewind-v4'; const x = twx.gap_3;`,
      errors: [{ messageId: 'preferCanonical' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.gap_['12px'].top_['-8px'];`,
      output: `import { tw } from 'typewind-v4'; const x = tw.gap_3._top_2;`,
      errors: [{ messageId: 'preferCanonical' }, { messageId: 'preferCanonical' }],
    },
  ],
});
