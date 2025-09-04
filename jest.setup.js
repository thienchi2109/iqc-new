/**
 * Jest setup file for global test configuration
 * This file runs before each test suite
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js specific globals
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'qaqc',
  ...overrides,
});

global.createMockProfile = (overrides = {}) => ({
  id: 'test-profile-id',
  name: 'Test Profile',
  rules: {
    '1-2s': { enabled: true, n: 2 },
    '1-3s': { enabled: true, n: 3 },
  },
  scope_type: 'global',
  active_from: null,
  active_until: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

global.createMockBinding = (overrides = {}) => ({
  id: 'test-binding-id',
  profile_id: 'test-profile-id',
  scope_type: 'global',
  scope_device_id: null,
  scope_test_id: null,
  priority: 4,
  created_at: new Date('2024-01-01'),
  ...overrides,
});

global.createMockQCResults = (overrides = []) => {
  const defaults = [
    {
      id: '1',
      value: 15.0,
      mean: 15.0,
      sd: 0.5,
      controlLevel: 1,
      timestamp: new Date('2024-01-01'),
    },
    {
      id: '2', 
      value: 14.8,
      mean: 15.0,
      sd: 0.5,
      controlLevel: 1,
      timestamp: new Date('2024-01-02'),
    },
  ];
  
  return overrides.length > 0 ? overrides : defaults;
};

// Mock fetch for API calls in tests
global.fetch = jest.fn();

// Setup for async test utilities
beforeEach(() => {
  // Reset fetch mock before each test
  if (global.fetch.mockReset) {
    global.fetch.mockReset();
  }
});

// Error handling for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally fail the test
  // throw reason;
});

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock timers - useful for testing date-based logic
beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(new Date('2024-01-15T00:00:00.000Z'));
});

afterAll(() => {
  jest.useRealTimers();
});
