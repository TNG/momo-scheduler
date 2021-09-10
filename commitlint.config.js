module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-empty': [2, 'never'],
    'header-max-length': [2, 'always', 120],
    'signed-off-by': [2, 'always', 'Signed-off-by:'],
  },
};
