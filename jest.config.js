export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mongoose|dotenv|@octokit)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Configuration pour tests avec données réelles GitHub
  testTimeout: 60000, // Timeout plus long pour les vraies requêtes API
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // Suppression des configurations de mocks pour utiliser les vraies implémentations
  clearMocks: false,
  resetMocks: false,
  // Configuration pour tests séquentiels (important pour le contexte partagé)
  maxWorkers: 1, // Force l'exécution séquentielle pour préserver le contexte
  // Variables d'environnement pour les tests
  setupFiles: ['<rootDir>/tests/setup.ts']
}; 