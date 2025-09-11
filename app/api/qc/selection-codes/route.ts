import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { devices, tests, qcLevels, qcLots } from '@/lib/db/schema'
import { and, eq, inArray, like } from 'drizzle-orm'

// GET /api/qc/selection-codes
// Provides selection lists for devices, tests, levels, lots with optional filters
// Query params:
// - include: comma-separated list of which lists to include (devices,tests,levels,lots). Default: all.
// - isActive: true/false (applies to devices, tests, levels)
// - q: search term (applies to devices(code/name) and tests(code/name))
// - testId: filter levels by test
// - levelIds: repeatable levelId for lots; or single levelId
export const GET = withAuth(async (request: NextRequest) => {
	const { searchParams } = new URL(request.url)
	const include = (searchParams.get('include') || 'devices,tests,levels,lots').split(',').map(s => s.trim())
	const isActiveParam = searchParams.get('isActive')
	const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'
	const q = searchParams.get('q')?.trim()
	const testId = searchParams.get('testId') || undefined
	const levelId = searchParams.get('levelId') || undefined
	const levelIds = searchParams.getAll('levelId')

	const payload: Record<string, any> = {}

	try {
		// Devices
		if (include.includes('devices')) {
			let query = db.select().from(devices)
			const conditions: any[] = []
			if (isActive !== undefined) conditions.push(eq(devices.isActive, isActive))
			if (q) conditions.push(like(devices.name, `%${q}%`))
			if (conditions.length) query = query.where(and(...conditions)) as typeof query
			const rows = await query.orderBy(devices.name)
			payload.devices = rows.map(d => ({ id: d.id, code: d.code, name: d.name, isActive: d.isActive }))
		}

		// Tests
		if (include.includes('tests')) {
			let query = db.select().from(tests)
			const conditions: any[] = []
			if (isActive !== undefined) conditions.push(eq(tests.isActive, isActive))
			if (q) conditions.push(like(tests.name, `%${q}%`))
			if (conditions.length) query = query.where(and(...conditions)) as typeof query
			const rows = await query.orderBy(tests.name)
			payload.tests = rows.map(t => ({ id: t.id, code: t.code, name: t.name, isActive: t.isActive }))
		}

		// Levels
		if (include.includes('levels')) {
			let query = db.select().from(qcLevels)
			const conditions: any[] = []
			if (typeof isActive === 'boolean') conditions.push(eq(qcLevels.isActive, isActive))
			if (testId) conditions.push(eq(qcLevels.testId, testId))
			if (conditions.length) query = query.where(and(...conditions)) as typeof query
			const rows = await query
			payload.levels = rows.map(l => ({ id: l.id, testId: l.testId, level: l.level, material: l.material, isActive: l.isActive }))
		}

		// Lots
		if (include.includes('lots')) {
			let query = db.select().from(qcLots)
			if (levelIds.length > 0) {
				query = query.where(inArray(qcLots.levelId, levelIds)) as typeof query
			} else if (levelId) {
				query = query.where(eq(qcLots.levelId, levelId)) as typeof query
			}
			const rows = await query
			payload.lots = rows.map(l => ({ id: l.id, levelId: l.levelId, lotCode: l.lotCode, expireDate: l.expireDate, effectiveFrom: l.effectiveFrom, effectiveTo: l.effectiveTo }))
		}

		return NextResponse.json(payload)
	} catch (error) {
		console.error('Error fetching selection codes:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
})
