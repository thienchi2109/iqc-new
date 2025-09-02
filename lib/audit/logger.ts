import { db } from '@/lib/db/client'
import { auditLog } from '@/lib/db/schema'
import type { AuthUser } from '@/lib/auth/middleware'

export interface AuditLogEntry {
  action: string
  entity: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(
    user: AuthUser,
    entry: AuditLogEntry
  ): Promise<void> {
    try {
      const diff: Record<string, any> = {}
      
      // Create diff object showing changes
      if (entry.oldValues && entry.newValues) {
        diff.before = entry.oldValues
        diff.after = entry.newValues
        diff.changes = this.getChanges(entry.oldValues, entry.newValues)
      } else if (entry.newValues) {
        diff.data = entry.newValues
      } else if (entry.oldValues) {
        diff.data = entry.oldValues
      }

      // Add metadata if provided
      if (entry.metadata) {
        diff.metadata = entry.metadata
      }

      await db.insert(auditLog).values({
        actorId: user.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        diff: Object.keys(diff).length > 0 ? diff : null,
        at: new Date(),
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log creation of a new entity
   */
  static async logCreate(
    user: AuthUser,
    entity: string,
    entityId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'CREATE',
      entity,
      entityId,
      newValues: data,
      metadata,
    })
  }

  /**
   * Log update of an existing entity
   */
  static async logUpdate(
    user: AuthUser,
    entity: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'UPDATE',
      entity,
      entityId,
      oldValues,
      newValues,
      metadata,
    })
  }

  /**
   * Log deletion of an entity
   */
  static async logDelete(
    user: AuthUser,
    entity: string,
    entityId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'DELETE',
      entity,
      entityId,
      oldValues: data,
      metadata,
    })
  }

  /**
   * Log QC run operations
   */
  static async logQcRun(
    user: AuthUser,
    action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT',
    runId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: `QC_RUN_${action}`,
      entity: 'qc_run',
      entityId: runId,
      newValues: data,
      metadata,
    })
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    user: AuthUser,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: `AUTH_${action}`,
      entity: 'user_session',
      entityId: user.id,
      metadata,
    })
  }

  /**
   * Log security events
   */
  static async logSecurity(
    user: AuthUser,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: `SECURITY_${action}`,
      entity,
      entityId,
      metadata,
    })
  }

  /**
   * Log configuration changes
   */
  static async logConfig(
    user: AuthUser,
    configType: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'CONFIG_CHANGE',
      entity: configType,
      oldValues,
      newValues,
      metadata,
    })
  }

  /**
   * Log CAPA operations
   */
  static async logCapa(
    user: AuthUser,
    action: 'CREATE' | 'UPDATE' | 'SUBMIT' | 'APPROVE' | 'REJECT',
    capaId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: `CAPA_${action}`,
      entity: 'capa',
      entityId: capaId,
      newValues: data,
      metadata,
    })
  }

  /**
   * Log report generation
   */
  static async logReport(
    user: AuthUser,
    reportType: string,
    filters: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'REPORT_GENERATED',
      entity: 'report',
      newValues: { reportType, filters },
      metadata,
    })
  }

  /**
   * Log data export
   */
  static async logExport(
    user: AuthUser,
    exportType: string,
    filters: Record<string, any>,
    recordCount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(user, {
      action: 'DATA_EXPORT',
      entity: 'export',
      newValues: { exportType, filters, recordCount },
      metadata,
    })
  }

  /**
   * Get changes between old and new values
   */
  private static getChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {}

    // Check for changed and new fields
    for (const [key, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[key]
      if (oldValue !== newValue) {
        changes[key] = { from: oldValue, to: newValue }
      }
    }

    // Check for removed fields
    for (const [key, oldValue] of Object.entries(oldValues)) {
      if (!(key in newValues)) {
        changes[key] = { from: oldValue, to: undefined }
      }
    }

    return changes
  }

  /**
   * Get audit log entries with pagination
   */
  static async getAuditLog(
    filters: {
      actorId?: string
      entity?: string
      action?: string
      from?: Date
      to?: Date
      limit?: number
      offset?: number
    } = {}
  ) {
    // Implementation would query the audit_log table
    // This is a placeholder for the actual implementation
    return []
  }

  /**
   * Search audit log entries
   */
  static async searchAuditLog(
    searchTerm: string,
    filters: {
      actorId?: string
      entity?: string
      from?: Date
      to?: Date
    } = {}
  ) {
    // Implementation would search through audit log entries
    // This is a placeholder for the actual implementation
    return []
  }
}