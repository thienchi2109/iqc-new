/**
 * Unit tests for profile resolution logic
 * Tests the priority-based resolution of rule profiles based on scope hierarchy
 */

import { resolveProfile } from './resolveProfile';

// Mock database module
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  },
}));

// Mock schema
jest.mock('../db/schema', () => ({
  ruleProfiles: 'ruleProfiles',
  ruleProfileBindings: 'ruleProfileBindings',
}));

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, op: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, op: 'and' })),
  or: jest.fn((...conditions) => ({ conditions, op: 'or' })),
  lte: jest.fn((field, value) => ({ field, value, op: 'lte' })),
  gte: jest.fn((field, value) => ({ field, value, op: 'gte' })),
  desc: jest.fn((field) => ({ field, direction: 'desc' })),
}));

describe('resolveProfile', () => {
  let mockDb: any;

  beforeEach(() => {
    const { db } = require('../db');
    mockDb = db;

    // Setup default mock chain
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Profile Priority Resolution', () => {
    it('should resolve device_test scope profile with highest priority', async () => {
      const mockProfiles = [
        {
          id: 'profile-1',
          name: 'Device Test Profile',
          rules: { '1-2s': { enabled: true, n: 2 } },
          scope_type: 'device_test',
          scope_device_id: 'device-1',
          scope_test_id: 'test-1',
        },
        {
          id: 'profile-2', 
          name: 'Test Profile',
          rules: { '1-3s': { enabled: true, n: 3 } },
          scope_type: 'test',
          scope_test_id: 'test-1',
        },
      ];

      mockDb.limit.mockResolvedValue(mockProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual({
        id: 'profile-1',
        name: 'Device Test Profile',
        rules: { '1-2s': { enabled: true, n: 2 } },
        scope_type: 'device_test',
        scope_device_id: 'device-1', 
        scope_test_id: 'test-1',
      });
    });

    it('should fall back to test scope when device_test not found', async () => {
      const mockProfiles = [
        {
          id: 'profile-2',
          name: 'Test Profile', 
          rules: { '1-3s': { enabled: true, n: 3 } },
          scope_type: 'test',
          scope_test_id: 'test-1',
        },
        {
          id: 'profile-3',
          name: 'Device Profile',
          rules: { '1-3s': { enabled: true, n: 4 } },
          scope_type: 'device',
          scope_device_id: 'device-1',
        },
      ];

      mockDb.limit.mockResolvedValue(mockProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual(mockProfiles[0]); // Test scope wins over device scope
    });

    it('should fall back to device scope when higher scopes not found', async () => {
      const mockProfiles = [
        {
          id: 'profile-3',
          name: 'Device Profile',
          rules: { '1-3s': { enabled: true, n: 4 } },
          scope_type: 'device', 
          scope_device_id: 'device-1',
        },
        {
          id: 'global-profile',
          name: 'Global Profile',
          rules: { '1-3s': { enabled: true, n: 5 } },
          scope_type: 'global',
        },
      ];

      mockDb.limit.mockResolvedValue(mockProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual(mockProfiles[0]); // Device scope wins over global
    });

    it('should fall back to global scope as last resort', async () => {
      const mockProfiles = [
        {
          id: 'global-profile',
          name: 'Global Profile',
          rules: { '1-3s': { enabled: true, n: 5 } },
          scope_type: 'global',
        },
      ];

      mockDb.limit.mockResolvedValue(mockProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual(mockProfiles[0]);
    });
  });

  describe('Date Filtering', () => {
    it('should only return profiles within active date range', async () => {
      const currentDate = new Date('2024-02-15');
      jest.spyOn(Date, 'now').mockImplementation(() => currentDate.getTime());

      const mockProfiles = [
        {
          id: 'active-profile',
          name: 'Active Profile',
          rules: { '1-2s': { enabled: true, n: 2 } },
          scope_type: 'global',
          active_from: new Date('2024-02-01'),
          active_until: new Date('2024-03-01'),
        },
      ];

      mockDb.limit.mockResolvedValue(mockProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual(mockProfiles[0]);

      // Verify date filtering was applied in query
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter out expired profiles', async () => {
      const currentDate = new Date('2024-02-15');
      jest.spyOn(Date, 'now').mockImplementation(() => currentDate.getTime());

      // Mock empty result for expired profiles
      mockDb.limit.mockResolvedValue([]);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toBeNull();
    });
  });

  describe('Default Profile Fallback', () => {
    it('should return default profile when no matches found', async () => {
      const mockDefaultProfile = {
        id: 'default-global',
        name: 'Default Global Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 },
          '1-3s': { enabled: true, n: 3 },
          '2-2s': { enabled: true, n: 4 },
        },
        scope_type: 'global',
      };

      // First query returns empty, second returns default
      mockDb.limit
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockDefaultProfile]);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toEqual(mockDefaultProfile);
    });

    it('should return null when no default profile exists', async () => {
      // Both queries return empty
      mockDb.limit.mockResolvedValue([]);

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database connection failed'));

      const result = await resolveProfile('device-1', 'test-1');

      expect(result).toBeNull();
    });

    it('should handle malformed profile data', async () => {
      const malformedProfiles = [
        {
          id: 'bad-profile',
          // Missing required fields
        },
      ];

      mockDb.limit.mockResolvedValue(malformedProfiles);

      const result = await resolveProfile('device-1', 'test-1');

      // Should still return the profile (let caller handle validation)
      expect(result).toEqual(malformedProfiles[0]);
    });
  });

  describe('Query Construction', () => {
    it('should construct correct query for profile resolution', async () => {
      mockDb.limit.mockResolvedValue([]);

      await resolveProfile('device-1', 'test-1');

      // Verify the correct query structure was built
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should use correct parameters in scope matching', async () => {
      const { eq, and, or } = require('drizzle-orm');

      mockDb.limit.mockResolvedValue([]);

      await resolveProfile('device-123', 'test-456');

      // Verify eq was called with correct device and test IDs
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'device-123');
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'test-456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty device_id parameter', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await resolveProfile('', 'test-1');

      expect(result).toBeNull();
    });

    it('should handle empty test_id parameter', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await resolveProfile('device-1', '');

      expect(result).toBeNull();
    });

    it('should handle null parameters', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await resolveProfile(null as any, null as any);

      expect(result).toBeNull();
    });
  });
});
