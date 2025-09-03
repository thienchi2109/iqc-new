import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { auditLog, users } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, like, or } from 'drizzle-orm'
import { z } from 'zod'

const auditFiltersSchema = z.object({
  actorId: z.string().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid from date format',
  }).optional(),
  to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid to date format',
  }).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /api/audit - Get audit log entries
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const filters = auditFiltersSchema.parse(Object.fromEntries(searchParams))

      let query = db
        .select({
          id: auditLog.id,
          actorId: auditLog.actorId,
          actorName: users.name,
          actorUsername: users.username,
          action: auditLog.action,
          entity: auditLog.entity,
          entityId: auditLog.entityId,
          diff: auditLog.diff,
          at: auditLog.at,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))

      // Apply filters
      const conditions = []
      
      if (filters.actorId) {
        conditions.push(eq(auditLog.actorId, filters.actorId))
      }
      
      if (filters.entity) {
        conditions.push(eq(auditLog.entity, filters.entity))
      }
      
      if (filters.action) {
        conditions.push(like(auditLog.action, `%${filters.action}%`))
      }
      
      if (filters.from) {
        conditions.push(gte(auditLog.at, new Date(filters.from)))
      }
      
      if (filters.to) {
        conditions.push(lte(auditLog.at, new Date(filters.to)))
      }
      
      if (filters.search) {
        conditions.push(
          or(
            like(auditLog.action, `%${filters.search}%`),
            like(auditLog.entity, `%${filters.search}%`),
            like(users.name, `%${filters.search}%`),
            like(users.username, `%${filters.search}%`)
          )
        )
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query
      }

      const logs = await query
        .orderBy(desc(auditLog.at))
        .limit(filters.limit)
        .offset(filters.offset)

      // Get total count for pagination
      let countQuery = db
        .select({ count: auditLog.id })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as typeof countQuery
      }

      const [{ count: totalCount }] = await countQuery

      return NextResponse.json({
        logs,
        pagination: {
          total: totalCount,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < Number(totalCount),
        },
      })
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.errors },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'audit-log:read' }
)