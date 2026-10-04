import { RuleTester } from 'eslint';
import rule from '../src/rules/no-grey-alias';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-grey-alias', rule, {
  valid: [
    `import { tw } from 'typewind-v4'; const x = tw.bg_gray_500;`,
    `import { tw } from 'typewind-v4'; const x = tw.text_gray_200.hover(tw.bg_gray_800);`,
    `import { tw } from 'typewind-v4'; const x = tw.raw('bg-gray-500');`,
    `import { tw } from 'typewind-v4'; const x = tw.variant('&:hover', 'bg-gray-500');`,
    `const grey = { bg_grey_500: true };`,
    `import { tw } from 'typewind-v4'; const x = other.bg_grey_500;`,
  ],
  invalid: [
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.bg_grey_500;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.bg_gray_500;`,
      errors: [{ messageId: 'preferGray' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.text_grey.hover(tw.bg_grey_800);`,
      output: `import { tw } from 'typewind-v4'; const x = tw.text_gray.hover(tw.bg_gray_800);`,
      errors: [{ messageId: 'preferGray' }, { messageId: 'preferGray' }],
    },
    {
      code: `import { tw as twx } from 'typewind-v4'; const x = twx.bg_grey_500;`,
      output: `import { tw as twx } from 'typewind-v4'; const x = twx.bg_gray_500;`,
      errors: [{ messageId: 'preferGray' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.raw('bg-grey-500');`,
      output: `import { tw } from 'typewind-v4'; const x = tw.raw('bg-gray-500');`,
      errors: [{ messageId: 'preferGray' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.variant('&:hover', 'bg-grey-500 hover:text-grey-200');`,
      output: `import { tw } from 'typewind-v4'; const x = tw.variant('&:hover', 'bg-gray-500 hover:text-gray-200');`,
      errors: [{ messageId: 'preferGray' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.grey_border_grey_500;`,
      output: `import { tw } from 'typewind-v4'; const x = tw.gray_border_gray_500;`,
      errors: [{ messageId: 'preferGray' }],
    },
  ],
});
