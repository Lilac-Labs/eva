module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['eval', 'dash', 'deps', 'ci', 'docs']],
  },
};