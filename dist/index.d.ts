import * as eslint from 'eslint';

declare const plugin: {
    rules: {
        'no-grey-alias': eslint.Rule.RuleModule;
        'prefer-canonical-value': eslint.Rule.RuleModule;
        'sort-classes': eslint.Rule.RuleModule;
        'no-duplicate-classes': eslint.Rule.RuleModule;
        'no-contradicting-classes': eslint.Rule.RuleModule;
        'enforces-shorthand': eslint.Rule.RuleModule;
    };
    configs: Record<string, unknown>;
};
declare const rules: {
    'no-grey-alias': eslint.Rule.RuleModule;
    'prefer-canonical-value': eslint.Rule.RuleModule;
    'sort-classes': eslint.Rule.RuleModule;
    'no-duplicate-classes': eslint.Rule.RuleModule;
    'no-contradicting-classes': eslint.Rule.RuleModule;
    'enforces-shorthand': eslint.Rule.RuleModule;
};
declare const configs: Record<string, unknown>;

export { configs, plugin as default, rules };
