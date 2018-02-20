// npm i --save-dev eslint babel-eslint eslint-config-standard eslint-plugin-import eslint-plugin-jest eslint-plugin-node eslint-plugin-promise eslint-plugin-standard prettier eslint-config-prettier eslint-plugin-prettier

module.exports = {
  extends: ['standard', 'prettier'],
  env: {
    node: true,
    jest: true
  },
  parserOptions: {
    impliedStrict: true
  },
  plugins: ['prettier', 'jest'],
  globals: {},
  rules: {
    'prettier/prettier': [2, require('./.prettierrc')],
    'no-console': 1
  }
};
