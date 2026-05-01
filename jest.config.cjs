module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^three/examples/jsm/controls/OrbitControls\\.js$':
      '<rootDir>/src/test/orbit-controls-mock.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|webp|avif)$':
      '<rootDir>/src/test/file-mock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: {
          ignoreCodes: [7016, 7006],
        },
      },
    ],
    '^.+/public/editor/js/.+\\.js$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        allowJs: true,
        diagnostics: {
          ignoreCodes: [7016, 7006],
        },
      },
    ],
  },
}
