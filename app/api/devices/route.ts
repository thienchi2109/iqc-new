import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { devices } from '@/lib/db/schema'
import { createDeviceSchema, updateDeviceSchema } from '@/lib/qc/validation'
import { eq } from 'drizzle-orm'

// GET /api/devices - Get all devices
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const isActive = searchParams.get('isActive')

      let query = db.select().from(devices)
      
      if (isActive !== null) {
        query = query.where(eq(devices.isActive, isActive === 'true')) as typeof query
      }

      const allDevices = await query.orderBy(devices.name)

      return NextResponse.json(allDevices)
    } catch (error) {
      console.error('Error fetching devices:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'devices:read' }
)

// POST /api/devices - Create new device
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      const deviceData = createDeviceSchema.parse(body)

      const [newDevice] = await db
        .insert(devices)
        .values(deviceData)
        .returning()

      return NextResponse.json(newDevice)
    } catch (error) {
      console.error('Error creating device:', error)
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'devices:write' }
)

// PUT /api/devices/[id] - Update device
export const PUT = withAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const deviceId = url.pathname.split('/').pop()
      
      if (!deviceId) {
        return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
      }

      const body = await request.json()
      const deviceData = updateDeviceSchema.parse(body)

      const [updatedDevice] = await db
        .update(devices)
        .set(deviceData)
        .where(eq(devices.id, deviceId))
        .returning()

      if (!updatedDevice) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 })
      }

      return NextResponse.json(updatedDevice)
    } catch (error) {
      console.error('Error updating device:', error)
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'devices:write' }
)