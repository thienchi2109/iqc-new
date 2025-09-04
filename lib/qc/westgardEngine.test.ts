/**
 * Unit tests for Westgard Engine with Rule Profile integration
 * Tests the dynamic rule evaluation based on resolved profiles
 */

import { evaluateWestgardRules } from './westgardEngine';

// Mock the profile resolution
jest.mock('./resolveProfile', () => ({
  resolveProfile: jest.fn(),
}));

// Mock environment variables
const originalEnv = process.env;

describe('Westgard Engine with Rule Profiles', () => {
  let mockResolveProfile: jest.MockedFunction<typeof import('./resolveProfile').resolveProfile>;

  beforeEach(() => {
    mockResolveProfile = require('./resolveProfile').resolveProfile;
    jest.clearAllMocks();
    
    // Reset environment
    jest.replaceProperty(process, 'env', {
      ...originalEnv,
    });
  });

  afterEach(() => {
    jest.replaceProperty(process, 'env', originalEnv);
  });

  describe('Feature Flag Behavior', () => {
    it('should use profile-based rules when feature flag is enabled', async () => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'true';
      
      const mockProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 },
          '1-3s': { enabled: false, n: 3 },
          '2-2s': { enabled: true, n: 4 },
        },
        scope_type: 'device_test',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 15.2, mean: 15.0, sd: 0.5, controlLevel: 1 },
        { id: '2', value: 14.5, mean: 15.0, sd: 0.5, controlLevel: 1 },
        { id: '3', value: 16.8, mean: 15.0, sd: 0.5, controlLevel: 1 }, // This should trigger 1-2s
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      expect(mockResolveProfile).toHaveBeenCalledWith('device-1', 'test-1');
      expect(result).toEqual(
        expect.objectContaining({
          profileUsed: mockProfile,
          rulesEvaluated: expect.arrayContaining(['1-2s', '2-2s']), // Only enabled rules
        })
      );
    });

    it('should use legacy behavior when feature flag is disabled', async () => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'false';

      const qcResults = [
        { id: '1', value: 15.2, mean: 15.0, sd: 0.5, controlLevel: 1 },
        { id: '2', value: 14.5, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      expect(mockResolveProfile).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          profileUsed: null,
          rulesEvaluated: expect.arrayContaining(['1-2s', '1-3s', '2-2s', '4-1s', 'R-4s']), // All default rules
        })
      );
    });

    it('should default to false when feature flag is not set', async () => {
      delete process.env.USE_WESTGARD_RULE_PROFILES;

      const qcResults = [
        { id: '1', value: 15.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      expect(mockResolveProfile).not.toHaveBeenCalled();
      expect(result.profileUsed).toBeNull();
    });
  });

  describe('Profile-Based Rule Evaluation', () => {
    beforeEach(() => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'true';
    });

    it('should evaluate only enabled rules from profile', async () => {
      const mockProfile = {
        id: 'selective-profile',
        name: 'Selective Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 },
          '1-3s': { enabled: false, n: 3 }, // Disabled
          '2-2s': { enabled: true, n: 4 },
          'R-4s': { enabled: false, r: 4 }, // Disabled
        },
        scope_type: 'test',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +4σ
        { id: '2', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +4σ consecutive
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      expect(result.rulesEvaluated).toEqual(['1-2s', '2-2s']);
      expect(result.rulesEvaluated).not.toContain('1-3s');
      expect(result.rulesEvaluated).not.toContain('R-4s');
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: '1-2s' }),
          expect.objectContaining({ rule: '2-2s' }),
        ])
      );
    });

    it('should use custom thresholds from profile rules', async () => {
      const mockProfile = {
        id: 'custom-profile',
        name: 'Custom Threshold Profile',
        rules: {
          '1-2s': { enabled: true, n: 1.5 }, // Custom threshold: 1.5σ instead of 2σ
          '2-2s': { enabled: true, n: 3 }, // Custom threshold: 3 consecutive points
        },
        scope_type: 'device',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 15.8, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +1.6σ
        { id: '2', value: 15.7, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +1.4σ  
        { id: '3', value: 15.9, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +1.8σ
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should trigger 1-1.5s rule (custom threshold)
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            rule: '1-2s', // Rule name stays the same, but uses custom threshold
            points: expect.arrayContaining([
              expect.objectContaining({ value: 15.8 }), // This point exceeds 1.5σ threshold
              expect.objectContaining({ value: 15.9 }), // This point exceeds 1.5σ threshold
            ]),
          }),
        ])
      );
    });

    it('should handle missing profile gracefully', async () => {
      mockResolveProfile.mockResolvedValue(null);

      const qcResults = [
        { id: '1', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should fall back to default rules
      expect(result.profileUsed).toBeNull();
      expect(result.rulesEvaluated).toEqual(['1-2s', '1-3s', '2-2s', '4-1s', 'R-4s']); // Default rules
    });

    it('should handle profile resolution errors gracefully', async () => {
      mockResolveProfile.mockRejectedValue(new Error('Database error'));

      const qcResults = [
        { id: '1', value: 15.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should fall back to default behavior without throwing
      expect(result.profileUsed).toBeNull();
      expect(result.rulesEvaluated).toBeDefined();
    });
  });

  describe('Rule Configuration Validation', () => {
    beforeEach(() => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'true';
    });

    it('should ignore rules with invalid configuration', async () => {
      const mockProfile = {
        id: 'invalid-profile',
        name: 'Invalid Config Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 }, // Valid
          '2-2s': { enabled: true }, // Missing 'n' parameter
          'R-4s': { enabled: true, r: 'invalid' }, // Invalid 'r' parameter type
          '4-1s': { enabled: true, n: 0 }, // Invalid 'n' value
        },
        scope_type: 'global',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
        { id: '2', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should only evaluate valid rules
      expect(result.rulesEvaluated).toEqual(['1-2s']);
      expect(result.configurationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: '2-2s', error: expect.stringMatching(/missing.*parameter/) }),
          expect.objectContaining({ rule: 'R-4s', error: expect.stringMatching(/invalid.*parameter/) }),
          expect.objectContaining({ rule: '4-1s', error: expect.stringMatching(/invalid.*value/) }),
        ])
      );
    });

    it('should handle empty rules object', async () => {
      const mockProfile = {
        id: 'empty-profile',
        name: 'Empty Rules Profile',
        rules: {},
        scope_type: 'global',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 },
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should fall back to default rules when profile has no rules
      expect(result.rulesEvaluated).toEqual(['1-2s', '1-3s', '2-2s', '4-1s', 'R-4s']);
      expect(result.profileUsed).toEqual(mockProfile);
    });
  });

  describe('Multi-Level Control Rules', () => {
    beforeEach(() => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'true';
    });

    it('should evaluate rules across different control levels', async () => {
      const mockProfile = {
        id: 'multi-level-profile',
        name: 'Multi-Level Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 },
          'R-4s': { enabled: true, r: 4 }, // Range rule across levels
        },
        scope_type: 'test',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      const qcResults = [
        { id: '1', value: 17.0, mean: 15.0, sd: 0.5, controlLevel: 1 }, // Level 1: +4σ
        { id: '2', value: 12.0, mean: 14.0, sd: 0.5, controlLevel: 2 }, // Level 2: -4σ
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: '1-2s' }), // Single point violation
          expect.objectContaining({ rule: 'R-4s' }), // Range violation
        ])
      );
    });
  });

  describe('Historical QC Data Integration', () => {
    beforeEach(() => {
      process.env.USE_WESTGARD_RULE_PROFILES = 'true';
    });

    it('should evaluate trending rules with historical context', async () => {
      const mockProfile = {
        id: 'trending-profile',
        name: 'Trending Rules Profile',
        rules: {
          '4-1s': { enabled: true, n: 4 }, // 4 consecutive points on same side
          '10x': { enabled: true, n: 10 }, // 10 consecutive points (if implemented)
        },
        scope_type: 'device',
      };

      mockResolveProfile.mockResolvedValue(mockProfile);

      // Sequential QC results showing a trend
      const qcResults = [
        { id: '1', value: 15.3, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +0.6σ
        { id: '2', value: 15.2, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +0.4σ
        { id: '3', value: 15.1, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +0.2σ
        { id: '4', value: 15.4, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +0.8σ
        { id: '5', value: 15.2, mean: 15.0, sd: 0.5, controlLevel: 1 }, // +0.4σ
      ];

      const result = await evaluateWestgardRules(qcResults, 'device-1', 'test-1');

      // Should detect 4+ consecutive points on positive side
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            rule: '4-1s',
            points: expect.arrayContaining([
              expect.objectContaining({ value: 15.3 }),
              expect.objectContaining({ value: 15.2 }),
              expect.objectContaining({ value: 15.1 }),
              expect.objectContaining({ value: 15.4 }),
            ]),
          }),
        ])
      );
    });
  });
});
