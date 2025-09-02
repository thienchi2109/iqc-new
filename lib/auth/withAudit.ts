import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthUser } from './middleware'
import { AuditLogger } from '@/lib/audit/logger'

interface AuditConfig {
  entity: string
  action?: string
  skipAudit?: boolean
}

/**
 * Higher-order function to wrap API routes with authentication, authorization, and audit logging
 */
export function withAuditAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  authOptions?: {
    permission?: string
    minimumRole?: 'tech' | 'supervisor' | 'qaqc' | 'admin'
  },
  auditConfig?: AuditConfig
) {
  return withAuth(
    async (request: NextRequest, user: AuthUser) => {
      const startTime = Date.now()
      let response: Response
      let error: Error | null = null

      try {
        // Execute the handler
        response = await handler(request, user)

        // Log successful operations (except GET requests unless specifically configured)
        if (!auditConfig?.skipAudit && auditConfig?.entity) {
          const method = request.method
          const shouldLog = method !== 'GET' || auditConfig.action

          if (shouldLog) {
            await logAuditEvent(request, user, auditConfig, response, null)
          }
        }

        return response
      } catch (err) {
        error = err as Error
        
        // Log failed operations
        if (!auditConfig?.skipAudit && auditConfig?.entity) {
          await logAuditEvent(request, user, auditConfig, null, error)
        }

        throw err
      } finally {
        // Log performance metrics for critical operations
        const duration = Date.now() - startTime
        if (duration > 5000) { // Log slow operations (>5s)
          console.warn(`Slow operation: ${request.method} ${request.url} took ${duration}ms`)
        }
      }
    },
    authOptions
  )
}

async function logAuditEvent(
  request: NextRequest,
  user: AuthUser,
  auditConfig: AuditConfig,
  response: Response | null,
  error: Error | null
) {
  try {
    const method = request.method
    const url = new URL(request.url)
    const path = url.pathname
    
    let action = auditConfig.action || `${method}_${auditConfig.entity.toUpperCase()}`
    
    if (error) {
      action = `${action}_FAILED`
    }

    const metadata: Record<string, any> = {
      method,
      path,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      timestamp: new Date().toISOString(),
    }

    if (response) {
      metadata.statusCode = response.status
    }

    if (error) {
      metadata.error = {
        message: error.message,
        stack: error.stack,
      }
    }

    // Extract request data for logging (be careful with sensitive data)
    if (method !== 'GET') {
      try {
        const body = await request.clone().text()
        if (body) {
          const parsedBody = JSON.parse(body)
          // Remove sensitive fields
          const { password, passwordHash, ...safeBody } = parsedBody
          metadata.requestData = safeBody
        }
      } catch {
        // Ignore if body is not JSON
      }
    }

    // Extract query parameters
    if (url.searchParams.size > 0) {
      metadata.queryParams = Object.fromEntries(url.searchParams)
    }

    await AuditLogger.log(user, {
      action,
      entity: auditConfig.entity,
      metadata,
    })
  } catch (auditError) {
    console.error('Failed to log audit event:', auditError)
    // Don't throw to avoid breaking the main operation
  }
}

/**
 * Specific audit wrapper for QC operations
 */
export function withQcAudit(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  authOptions?: {
    permission?: string
    minimumRole?: 'tech' | 'supervisor' | 'qaqc' | 'admin'
  }
) {
  return withAuditAuth(
    handler,
    authOptions,
    { entity: 'qc_operation' }
  )
}

/**
 * Specific audit wrapper for master data operations
 */
export function withMasterDataAudit(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  entity: string,
  authOptions?: {
    permission?: string
    minimumRole?: 'tech' | 'supervisor' | 'qaqc' | 'admin'
  }
) {
  return withAuditAuth(
    handler,
    authOptions,
    { entity }
  )
}

/**
 * Specific audit wrapper for configuration changes
 */
export function withConfigAudit(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  authOptions?: {
    permission?: string
    minimumRole?: 'tech' | 'supervisor' | 'qaqc' | 'admin'
  }
) {
  return withAuditAuth(
    handler,
    authOptions,
    { entity: 'configuration' }
  )
}

/**
 * Specific audit wrapper for report operations
 */
export function withReportAudit(
  handler: (request: NextRequest, user: AuthUser) => Promise<Response>,
  authOptions?: {
    permission?: string
    minimumRole?: 'tech' | 'supervisor' | 'qaqc' | 'admin'
  }
) {
  return withAuditAuth(
    handler,
    authOptions,
    { entity: 'report' }
  )
}