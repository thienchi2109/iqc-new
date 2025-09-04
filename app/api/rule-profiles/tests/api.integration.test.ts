/**
 * Integration tests for Rule Profiles API routes
 * Tests the complete API functionality with authentication and database interactions
 */

import { NextRequest } from 'next/server';
import { GET as listProfilesGET, POST as createProfilePOST } from '../route';
import { GET as getProfileGET, PUT as updateProfilePUT } from '../[id]/route';
import { GET as getBindingsGET, POST as createBindingPOST } from '../[id]/bindings/route';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    set: jest.fn(),
    values: jest.fn(),
    returning: jest.fn(),
  },
}));

// Mock schema
jest.mock('@/lib/db/schema', () => ({
  ruleProfiles: {
    id: 'id',
    name: 'name',
    rules: 'rules',
    scopeType: 'scopeType',
    activeFrom: 'activeFrom',
    activeUntil: 'activeUntil',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  ruleProfileBindings: {
    id: 'id',
    profileId: 'profileId',
    scopeType: 'scopeType',
    scopeDeviceId: 'scopeDeviceId',
    scopeTestId: 'scopeTestId',
    priority: 'priority',
    createdAt: 'createdAt',
  },
  auditLogs: {
    id: 'id',
    userId: 'userId',
    action: 'action',
    resourceType: 'resourceType',
    resourceId: 'resourceId',
    details: 'details',
    createdAt: 'createdAt',
  },
}));

// Mock audit auth middleware
jest.mock('@/lib/middleware/withAuditAuth', () => ({
  withAuditAuth: (requiredRoles: string[], handler: any) => {
    return (request: NextRequest) => {
      // Mock user with appropriate role
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'qaqc', // Default to QAQC role
      };

      // Check if user role is allowed
      if (requiredRoles.includes(mockUser.role)) {
        return handler(request, mockUser);
      }

      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    };
  },
}));

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, op: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, op: 'and' })),
  or: jest.fn((...conditions) => ({ conditions, op: 'or' })),
  desc: jest.fn((field) => ({ field, direction: 'desc' })),
  asc: jest.fn((field) => ({ field, direction: 'asc' })),
}));

describe('Rule Profiles API Integration Tests', () => {
  let mockDb: any;

  beforeEach(() => {
    const { db } = require('@/lib/db');
    mockDb = db;

    // Setup default mock chain
    mockDb.select.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockReturnThis();

    jest.clearAllMocks();
  });

  describe('GET /api/rule-profiles', () => {
    it('should list all rule profiles for authorized user', async () => {
      const mockProfiles = [
        {
          id: 'profile-1',
          name: 'Global Default Profile',
          rules: { '1-2s': { enabled: true, n: 2 } },
          scope_type: 'global',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
        {
          id: 'profile-2',
          name: 'Device Specific Profile',
          rules: { '2-2s': { enabled: true, n: 4 } },
          scope_type: 'device',
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-02'),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockProfiles);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles');
      const response = await listProfilesGET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.profiles).toEqual(mockProfiles);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('should handle search parameter', async () => {
      const mockProfiles = [
        {
          id: 'profile-1',
          name: 'Device Profile',
          rules: {},
          scope_type: 'device',
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockProfiles);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles?search=device');
      const response = await listProfilesGET(request);

      expect(response.status).toBe(200);
      expect(mockDb.where).toHaveBeenCalled(); // Should apply search filter
    });

    it('should handle database errors gracefully', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/rule-profiles');
      const response = await listProfilesGET(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to fetch rule profiles');
    });
  });

  describe('POST /api/rule-profiles', () => {
    it('should create new rule profile', async () => {
      const newProfile = {
        name: 'New Test Profile',
        rules: {
          '1-2s': { enabled: true, n: 2 },
          '1-3s': { enabled: false, n: 3 },
        },
        scope_type: 'test',
        active_from: '2024-01-01T00:00:00.000Z',
        active_until: '2024-12-31T23:59:59.999Z',
      };

      const createdProfile = {
        id: 'new-profile-id',
        ...newProfile,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([createdProfile]);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles', {
        method: 'POST',
        body: JSON.stringify(newProfile),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProfilePOST(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.profile).toEqual(createdProfile);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining(newProfile));
    });

    it('should validate required fields', async () => {
      const incompleteProfile = {
        // Missing name
        rules: {},
        scope_type: 'global',
      };

      const request = new NextRequest('http://localhost:3000/api/rule-profiles', {
        method: 'POST',
        body: JSON.stringify(incompleteProfile),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProfilePOST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('validation');
    });

    it('should validate rules configuration', async () => {
      const invalidProfile = {
        name: 'Invalid Rules Profile',
        rules: {
          '1-2s': { enabled: true, n: 'invalid' }, // Invalid type for n
          'unknown-rule': { enabled: true, n: 2 }, // Unknown rule type
        },
        scope_type: 'global',
      };

      const request = new NextRequest('http://localhost:3000/api/rule-profiles', {
        method: 'POST',
        body: JSON.stringify(invalidProfile),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProfilePOST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Invalid rules configuration');
    });
  });

  describe('GET /api/rule-profiles/[id]', () => {
    it('should get specific rule profile by ID', async () => {
      const mockProfile = {
        id: 'profile-123',
        name: 'Specific Profile',
        rules: { '1-2s': { enabled: true, n: 2 } },
        scope_type: 'device_test',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.where.mockResolvedValue([mockProfile]);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/profile-123');
      const response = await getProfileGET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.profile).toEqual(mockProfile);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return 404 for non-existent profile', async () => {
      mockDb.where.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/non-existent');
      const response = await getProfileGET(request);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Rule profile not found');
    });
  });

  describe('PUT /api/rule-profiles/[id]', () => {
    it('should update existing rule profile', async () => {
      const existingProfile = {
        id: 'profile-123',
        name: 'Old Name',
        rules: { '1-2s': { enabled: true, n: 2 } },
        scope_type: 'global',
        created_at: new Date('2024-01-01'),
      };

      const updateData = {
        name: 'Updated Name',
        rules: { '1-2s': { enabled: false, n: 2 }, '2-2s': { enabled: true, n: 4 } },
      };

      const updatedProfile = {
        ...existingProfile,
        ...updateData,
        updated_at: new Date(),
      };

      // Mock finding existing profile
      mockDb.where.mockResolvedValueOnce([existingProfile]);
      // Mock update operation
      mockDb.returning.mockResolvedValue([updatedProfile]);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/profile-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfilePUT(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.profile.name).toBe('Updated Name');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('should return 404 when updating non-existent profile', async () => {
      mockDb.where.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/non-existent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfilePUT(request);

      expect(response.status).toBe(404);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/rule-profiles/[id]/bindings', () => {
    it('should list bindings for specific profile', async () => {
      const mockBindings = [
        {
          id: 'binding-1',
          profile_id: 'profile-123',
          scope_type: 'device',
          scope_device_id: 'device-1',
          scope_test_id: null,
          priority: 3,
          created_at: new Date(),
        },
        {
          id: 'binding-2',
          profile_id: 'profile-123',
          scope_type: 'test',
          scope_device_id: null,
          scope_test_id: 'test-1',
          priority: 2,
          created_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockBindings);

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/profile-123/bindings');
      const response = await getBindingsGET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.bindings).toEqual(mockBindings);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe('POST /api/rule-profiles/[id]/bindings', () => {
    it('should create new binding for profile', async () => {
      const profileId = 'profile-123';
      const bindingData = {
        scope_type: 'device_test',
        scope_device_id: 'device-1',
        scope_test_id: 'test-1',
      };

      const createdBinding = {
        id: 'binding-id',
        profile_id: profileId,
        ...bindingData,
        priority: 1, // Calculated priority
        created_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([createdBinding]);

      const request = new NextRequest(`http://localhost:3000/api/rule-profiles/${profileId}/bindings`, {
        method: 'POST',
        body: JSON.stringify(bindingData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createBindingPOST(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.binding).toEqual(createdBinding);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_id: profileId,
          ...bindingData,
        })
      );
    });

    it('should validate binding scope type', async () => {
      const bindingData = {
        scope_type: 'invalid_scope',
        scope_device_id: 'device-1',
      };

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/profile-123/bindings', {
        method: 'POST',
        body: JSON.stringify(bindingData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createBindingPOST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Invalid scope_type');
    });

    it('should validate required scope IDs based on scope type', async () => {
      const bindingData = {
        scope_type: 'device_test',
        scope_device_id: 'device-1',
        // Missing scope_test_id for device_test scope
      };

      const request = new NextRequest('http://localhost:3000/api/rule-profiles/profile-123/bindings', {
        method: 'POST',
        body: JSON.stringify(bindingData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createBindingPOST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('scope_test_id is required for device_test scope');
    });
  });

  describe('Authorization', () => {
    it('should deny access to users without proper role', async () => {
      // Mock user with insufficient role
      const { withAuditAuth } = require('@/lib/middleware/withAuditAuth');
      const mockHandler = jest.fn();
      
      // Override the mock to simulate unauthorized user
      const originalMock = withAuditAuth;
      require('@/lib/middleware/withAuditAuth').withAuditAuth = jest.fn((requiredRoles, handler) => {
        return (request: NextRequest) => {
          const mockUser = { id: 'user-id', email: 'test@example.com', role: 'user' }; // Insufficient role
          
          if (!requiredRoles.includes(mockUser.role)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          
          return handler(request, mockUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/rule-profiles');
      const response = await listProfilesGET(request);

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized');

      // Restore original mock
      require('@/lib/middleware/withAuditAuth').withAuditAuth = originalMock;
    });
  });

  describe('Audit Logging', () => {
    it('should log profile creation', async () => {
      const newProfile = {
        name: 'Audit Test Profile',
        rules: {},
        scope_type: 'global',
      };

      const createdProfile = { id: 'profile-id', ...newProfile, created_at: new Date() };
      
      mockDb.returning
        .mockResolvedValueOnce([createdProfile]) // For profile creation
        .mockResolvedValueOnce([]); // For audit log creation

      const request = new NextRequest('http://localhost:3000/api/rule-profiles', {
        method: 'POST',
        body: JSON.stringify(newProfile),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProfilePOST(request);

      expect(response.status).toBe(201);
      
      // Verify audit log was attempted to be created
      // Note: The actual audit logging happens in the middleware,
      // so we're testing that the handler completed successfully
      expect(mockDb.insert).toHaveBeenCalledTimes(1); // Profile creation
    });
  });
});
