module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: ['plugin:vue/essential', 'airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['vue'],
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.js', '.jsx', '.vue', '.json'],
      },
    },
  },
  rules: {
    'import/extensions': [
      'error',
      'always',
      {
        js: 'never',
        mjs: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: [
          'state', // for vuex state
          'acc', // for reduce accumulators
          'e', // for e.returnvalue
        ],
      },
    ],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'max-len': 'off',
    'no-async-promise-executor': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'no-underscore-dangle': 'off',
    'vue/no-v-for-template-key-on-child': 'off',
    eqeqeq: 'off',
    'consistent-return': 'off',
    'class-methods-use-this': 'off',
    'no-restricted-syntax': 'off',
    'no-prototype-builtins': 'off',
    'vue/no-mutating-props': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-useless-template-attributes': 'off',
    'prefer-destructuring': 'off',
    'func-names': 'off',
    'no-shadow': 'off',
    'import/no-extraneous-dependencies': ['error', {devDependencies: true}],
    'import/prefer-default-export': 'off',
  },
};
