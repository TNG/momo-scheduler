/* eslint-disable @typescript-eslint/naming-convention */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  modulePathIgnorePatterns: ['dist'],
};
