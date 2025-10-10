module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+/uuid/.+\\.js$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!uuid)'],
  modulePathIgnorePatterns: ['dist'],
};
