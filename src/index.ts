import noGreyAlias from './rules/no-grey-alias';
import preferCanonicalValue from './rules/prefer-canonical-value';
import sortClasses from './rules/sort-classes';
import noDuplicateClasses from './rules/no-duplicate-classes';
import noContradictingClasses from './rules/no-contradicting-classes';
import enforcesShorthand from './rules/enforces-shorthand';

const plugin = {
  rules: {
    'no-grey-alias': noGreyAlias,
    'prefer-canonical-value': preferCanonicalValue,
    'sort-classes': sortClasses,
    'no-duplicate-classes': noDuplicateClasses,
    'no-contradicting-classes': noContradictingClasses,
    'enforces-shorthand': enforcesShorthand,
  },
  configs: {} as Record<string, unknown>,
};

plugin.configs.recommended = {
  plugins: { 'typewind-v4': plugin },
  rules: {
    'typewind-v4/no-grey-alias': 'error',
    'typewind-v4/prefer-canonical-value': 'warn',
    'typewind-v4/sort-classes': 'warn',
    'typewind-v4/no-duplicate-classes': 'error',
    'typewind-v4/no-contradicting-classes': 'warn',
    'typewind-v4/enforces-shorthand': 'warn',
  },
};

export const { rules, configs } = plugin;
export default plugin;
