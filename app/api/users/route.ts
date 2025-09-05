import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/users - Retrieve users for performer selection
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Only supervisors and admins can see other users
      if (!['supervisor', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          role: users.role,
        })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(users.name)

      return NextResponse.json(allUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'users:read' }
)