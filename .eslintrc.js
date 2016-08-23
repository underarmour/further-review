module.exports = {
  extends: 'airbnb',
  parser: 'babel-eslint',
  plugins: ['babel'],
  rules: {
    'arrow-body-style': 0,
    'no-param-reassign': ['error', {
      props: false,
    }],
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
    }],


    // temporarily turned off due to babel / eslint issue
    // can be burned back on when async/await is a first class
    // thing in eslint
    'generator-star-spacing': 0,
  },
};
