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
    `import { tw } from 'typewind-v4'; const x = tw.divide_gray_100.border_gray_200;`,
    `import { tw } from 'typewind-v4'; const x = tw.border_gray_200.divide_gray_100;`,
    `import { tw } from 'typewind-v4'; const x = tw.translate_x_4.translate_y_4;`,
    `import { tw } from 'typewind-v4'; const x = tw.rotate_x_45.skew_x_12;`,
    `import { tw } from 'typewind-v4'; const x = tw.rotate_x_45.rotate_y_45;`,
    `import { tw } from 'typewind-v4'; const x = tw.scale_x_50.scale_y_50;`,
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
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.divide_gray_100.divide_blue_100;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.translate_x_4.translate_x_8;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.scale_50.scale_x_75;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.skew_12.skew_x_12;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
    {
      code: `import { tw } from 'typewind-v4'; const x = tw.translate_4.translate_x_4;`,
      errors: [{ messageId: 'contradictingClasses' }],
    },
  ],
});
