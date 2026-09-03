// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2022',
        module: 'commonjs',
        moduleResolution: 'node16',
        esModuleInterop: true,
        strict: true,
        rootDir: 'src',
        ignoreDeprecations: '6.0',
        skipLibCheck: true,
      },
    }],
  },
};