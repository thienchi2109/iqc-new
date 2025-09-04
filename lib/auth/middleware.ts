import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './options'

export type UserRole = 'tech' | 'supervisor' | 'qaqc' | 'admin'

export interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  role: UserRole
}

/**
 * Role hierarchy and permissions mapping
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  tech: 1,
  supervisor: 2,
  qaqc: 3,
  admin: 4,
}

const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  // Master data management
  'devices:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'devices:write': ['admin'],
  'tests:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'tests:write': ['qaqc', 'admin'],
  'units:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'units:write': ['qaqc', 'admin'],
  'methods:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'methods:write': ['qaqc', 'admin'],
  
  // QC operations
  'qc-runs:create': ['tech', 'supervisor', 'qaqc', 'admin'],
  'qc-runs:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'qc-runs:update': ['supervisor', 'qaqc', 'admin'],
  'qc-runs:delete': ['admin'],
  
  'qc-limits:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'qc-limits:write': ['supervisor', 'qaqc', 'admin'],
  
  'qc-levels:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'qc-levels:write': ['qaqc', 'admin'],
  
  'qc-lots:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'qc-lots:write': ['qaqc', 'admin'],
  
  // CAPA management
  'capa:create': ['tech', 'supervisor', 'qaqc', 'admin'],
  'capa:read': ['tech', 'supervisor', 'qaqc', 'admin'],
  'capa:approve': ['supervisor', 'qaqc', 'admin'],
  
  // Reports and analytics
  'reports:read': ['supervisor', 'qaqc', 'admin'],
  'reports:export': ['supervisor', 'qaqc', 'admin'],
  
  // Rule profile management  
  'rule-profiles:read': ['supervisor', 'qaqc', 'admin'],
  'rule-profiles:write': ['qaqc', 'admin'],
  'rule-profiles:bind': ['qaqc', 'admin'],
  
  // System administration
  'users:read': ['admin'],
  'users:write': ['admin'],
  'audit-log:read': ['qaqc', 'admin'],
  'system:configure': ['admin'],
}

/**
 * Check if user has required permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const allowedRoles = ROLE_PERMISSIONS[permission]
  if (!allowedRoles) {
    return false
  }
  return allowedRoles.includes(userRole)
}

/**
 * Check if user role has sufficient hierarchy level
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Middleware to validate authentication and authorization
 */
export async function validateAuth(
  request: NextRequest,
  requiredPermission?: string,
  minimumRole?: UserRole
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { error: 'Unauthorized', status: 401 }
    }

    const user: AuthUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as UserRole,
    }

    // Check if user account is active (would need to query database in real implementation)
    // For now, assume all authenticated users are active

    // Check permission if specified
    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      return { error: 'Forbidden', status: 403 }
    }

    // Check minimum role if specified
    if (minimumRole && !hasMinimumRole(user.role, minimumRole)) {
      return { error: 'Insufficient privileges', status: 403 }
    }

    return { user }
  } catch (error) {
    console.error('Auth validation error:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Higher-order function to wrap API routes with authentication and authorization
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  options?: {
    permission?: string
    minimumRole?: UserRole
  }
) {
  return async (request: NextRequest) => {
    const authResult = await validateAuth(
      request,
      options?.permission,
      options?.minimumRole
    )

    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    return handler(request, authResult.user)
  }
}

/**
 * Resource ownership validation
 */
export async function validateResourceOwnership(
  userId: string,
  resourceType: string,
  resourceId: string,
  userRole: UserRole
): Promise<boolean> {
  // Admin and QA/QC roles can access all resources
  if (userRole === 'admin' || userRole === 'qaqc') {
    return true
  }

  // Supervisors can access resources in their department (simplified check)
  if (userRole === 'supervisor') {
    return true // In real implementation, check department/group membership
  }

  // Technicians can only access their own data for certain resources
  if (resourceType === 'qc-runs') {
    // Check if the QC run was performed by this user
    // In real implementation, query database to check performer_id
    return true // Simplified for demo
  }

  return false
}

/**
 * Get user capabilities based on role
 */
export function getUserCapabilities(role: UserRole) {
  return {
    canCreateRuns: hasPermission(role, 'qc-runs:create'),
    canApproveRuns: hasPermission(role, 'qc-runs:update'),
    canManageDevices: hasPermission(role, 'devices:write'),
    canManageTests: hasPermission(role, 'tests:write'),
    canConfigureLimits: hasPermission(role, 'qc-limits:write'),
    canViewReports: hasPermission(role, 'reports:read'),
    canExportData: hasPermission(role, 'reports:export'),
    canManageUsers: hasPermission(role, 'users:write'),
    canViewAuditLog: hasPermission(role, 'audit-log:read'),
    canApproveCapa: hasPermission(role, 'capa:approve'),
  }
}

/**
 * Route-specific permission mappings
 */
export const ROUTE_PERMISSIONS: Record<string, { permission?: string; minimumRole?: UserRole }> = {
  // Device management
  'GET:/api/devices': { permission: 'devices:read' },
  'POST:/api/devices': { permission: 'devices:write' },
  'PUT:/api/devices': { permission: 'devices:write' },
  'DELETE:/api/devices': { permission: 'devices:write' },
  
  // Test management
  'GET:/api/tests': { permission: 'tests:read' },
  'POST:/api/tests': { permission: 'tests:write' },
  'PUT:/api/tests': { permission: 'tests:write' },
  
  // QC operations
  'GET:/api/qc/runs': { permission: 'qc-runs:read' },
  'POST:/api/qc/runs': { permission: 'qc-runs:create' },
  'PUT:/api/qc/runs': { permission: 'qc-runs:update' },
  
  'GET:/api/qc/limits': { permission: 'qc-limits:read' },
  'POST:/api/qc/limits': { permission: 'qc-limits:write' },
  
  // Reports
  'GET:/api/reports': { permission: 'reports:read' },
  'GET:/api/export': { permission: 'reports:export' },
  
  // Rule profiles
  'GET:/api/rule-profiles': { permission: 'rule-profiles:read' },
  'POST:/api/rule-profiles': { permission: 'rule-profiles:write' },
  'PUT:/api/rule-profiles': { permission: 'rule-profiles:write' },
  'GET:/api/rule-profiles/resolve': { permission: 'rule-profiles:read' },
  'POST:/api/rule-profiles/*/bindings': { permission: 'rule-profiles:bind' },
  
  // Admin only routes
  'GET:/api/users': { minimumRole: 'admin' },
  'POST:/api/users': { minimumRole: 'admin' },
  'GET:/api/audit-log': { permission: 'audit-log:read' },
}
