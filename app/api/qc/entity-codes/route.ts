import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { tests, qcLevels, qcLots, devices } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

// GET /api/qc/entity-codes
// Flexible resolver to map IDs <-> codes for test/level/lot/device
// Accepts any combination of the following query params:
// - testId | testCode
// - levelId | level (L1|L2|L3) [requires test context when resolving by level label]
// - lotId | lotCode [requires level context when resolving by lotCode]
// - deviceId | deviceCode
// Returns both ids and codes when resolvable, plus an errors array for any missing lookups
export const GET = withAuth(async (request: NextRequest) => {
	const { searchParams } = new URL(request.url)

	const testIdParam = searchParams.get('testId') || undefined
	const testCodeParam = searchParams.get('testCode') || undefined
	const levelIdParam = searchParams.get('levelId') || undefined
	const levelLabelParam = searchParams.get('level') || undefined
	const lotIdParam = searchParams.get('lotId') || undefined
	const lotCodeParam = searchParams.get('lotCode') || undefined
	const deviceIdParam = searchParams.get('deviceId') || undefined
	const deviceCodeParam = searchParams.get('deviceCode') || undefined

	const ids: Record<string, string | undefined> = {
		testId: undefined,
		levelId: undefined,
		lotId: undefined,
		deviceId: undefined,
	}
	const codes: Record<string, string | undefined> = {
		testCode: undefined,
		level: undefined,
		lotCode: undefined,
		deviceCode: undefined,
	}
	const errors: string[] = []

	try {
		// Resolve test
		if (testIdParam || testCodeParam) {
			let row:
				| { id: string; code: string }
				| undefined
			if (testIdParam) {
				const res = await db
					.select({ id: tests.id, code: tests.code })
					.from(tests)
					.where(eq(tests.id, testIdParam))
					.limit(1)
				row = res[0]
			} else if (testCodeParam) {
				const res = await db
					.select({ id: tests.id, code: tests.code })
					.from(tests)
					.where(eq(tests.code, testCodeParam))
					.limit(1)
				row = res[0]
			}
			if (row) {
				ids.testId = row.id
				codes.testCode = row.code
			} else {
				errors.push('Test not found')
			}
		}

		// Resolve level
		if (levelIdParam || levelLabelParam) {
			// Ensure test context when resolving by label
			if (!levelIdParam && levelLabelParam) {
				if (!ids.testId && testCodeParam) {
					// Try resolve testId from testCode
					const res = await db
						.select({ id: tests.id })
						.from(tests)
						.where(eq(tests.code, testCodeParam))
						.limit(1)
					if (res[0]) ids.testId = res[0].id
				}
				if (!ids.testId) {
					errors.push('Cannot resolve level by label without test context (testId or testCode)')
				}
			}

			let row:
				| { id: string; level: string; testId: string }
				| undefined
			if (levelIdParam) {
				const res = await db
					.select({ id: qcLevels.id, level: qcLevels.level, testId: qcLevels.testId })
					.from(qcLevels)
					.where(eq(qcLevels.id, levelIdParam))
					.limit(1)
				row = res[0]
			} else if (levelLabelParam && ids.testId) {
				const res = await db
					.select({ id: qcLevels.id, level: qcLevels.level, testId: qcLevels.testId })
					.from(qcLevels)
					.where(and(eq(qcLevels.testId, ids.testId), sql`${qcLevels.level} = ${levelLabelParam}`))
					.limit(1)
				row = res[0]
			}
			if (row) {
				ids.levelId = row.id
				ids.testId = ids.testId || row.testId
				codes.level = row.level
			} else if (levelIdParam || levelLabelParam) {
				errors.push('Level not found')
			}
		}

		// Resolve lot
		if (lotIdParam || lotCodeParam) {
			// Ensure level context when resolving by lotCode
			if (!lotIdParam && lotCodeParam) {
				if (!ids.levelId && levelIdParam) ids.levelId = levelIdParam
				// Try resolve level if given level label + test
				if (!ids.levelId && levelLabelParam && (ids.testId || testCodeParam)) {
					if (!ids.testId && testCodeParam) {
						const res = await db
							.select({ id: tests.id })
							.from(tests)
							.where(eq(tests.code, testCodeParam))
							.limit(1)
						if (res[0]) ids.testId = res[0].id
					}
					if (ids.testId) {
						const res = await db
							.select({ id: qcLevels.id })
							.from(qcLevels)
							.where(and(eq(qcLevels.testId, ids.testId), sql`${qcLevels.level} = ${levelLabelParam}`))
							.limit(1)
						if (res[0]) ids.levelId = res[0].id
					}
				}
				if (!ids.levelId) {
					errors.push('Cannot resolve lot by code without level context (levelId or test+level)')
				}
			}

			let row:
				| { id: string; lotCode: string; levelId: string }
				| undefined
			if (lotIdParam) {
				const res = await db
					.select({ id: qcLots.id, lotCode: qcLots.lotCode, levelId: qcLots.levelId })
					.from(qcLots)
					.where(eq(qcLots.id, lotIdParam))
					.limit(1)
				row = res[0]
			} else if (lotCodeParam && ids.levelId) {
				const res = await db
					.select({ id: qcLots.id, lotCode: qcLots.lotCode, levelId: qcLots.levelId })
					.from(qcLots)
					.where(and(eq(qcLots.levelId, ids.levelId), eq(qcLots.lotCode, lotCodeParam)))
					.limit(1)
				row = res[0]
			}
			if (row) {
				ids.lotId = row.id
				ids.levelId = ids.levelId || row.levelId
				codes.lotCode = row.lotCode
			} else if (lotIdParam || lotCodeParam) {
				errors.push('Lot not found')
			}
		}

		// Resolve device
		if (deviceIdParam || deviceCodeParam) {
			let row:
				| { id: string; code: string }
				| undefined
			if (deviceIdParam) {
				const res = await db
					.select({ id: devices.id, code: devices.code })
					.from(devices)
					.where(eq(devices.id, deviceIdParam))
					.limit(1)
				row = res[0]
			} else if (deviceCodeParam) {
				const res = await db
					.select({ id: devices.id, code: devices.code })
					.from(devices)
					.where(eq(devices.code, deviceCodeParam))
					.limit(1)
				row = res[0]
			}
			if (row) {
				ids.deviceId = row.id
				codes.deviceCode = row.code
			} else {
				errors.push('Device not found')
			}
		}

		return NextResponse.json({ ids, codes, errors })
	} catch (error) {
		console.error('Error resolving entity codes:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
})
