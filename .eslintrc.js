module.exports = {
  extends: 'airbnb',
  rules: {
    'arrow-body-style': 0,
    'no-param-reassign': ['error', {
      props: false,
    }],
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
    }],
  },
};
