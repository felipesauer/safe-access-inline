export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['js', 'php', 'cli', 'docs', 'ci', 'deps'],
    ],
    'scope-empty': [1, 'never'],
  },
};
