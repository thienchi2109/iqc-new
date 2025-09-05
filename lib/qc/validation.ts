import { z } from 'zod'

// Common validation patterns
export const uuidSchema = z.string().uuid()
export const positiveNumberSchema = z.number().positive()
export const decimalStringSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid decimal number')

// User validation schemas
export const userRoleSchema = z.enum(['tech', 'supervisor', 'qaqc', 'admin'])

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  password: z.string().min(6),
})

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

// Device validation schemas
export const createDeviceSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
})

export const updateDeviceSchema = createDeviceSchema.partial()

// Test validation schemas
export const createTestSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  defaultUnitId: uuidSchema.optional(),
  defaultMethodId: uuidSchema.optional(),
  decimals: z.number().int().min(0).max(6).default(2),
})

export const updateTestSchema = createTestSchema.partial()

// Unit validation schemas
export const createUnitSchema = z.object({
  code: z.string().min(1).max(20),
  display: z.string().min(1).max(50),
})

export const updateUnitSchema = createUnitSchema

// Method validation schemas
export const createMethodSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
})

export const updateMethodSchema = createMethodSchema

// QC Level validation schemas
export const qcLevelEnum = z.enum(['L1', 'L2', 'L3'])

export const createQcLevelSchema = z.object({
  testId: uuidSchema,
  level: qcLevelEnum,
  material: z.string().max(200).optional(),
})

export const updateQcLevelSchema = createQcLevelSchema.partial()

// QC Lot validation schemas
export const createQcLotSchema = z.object({
  levelId: uuidSchema,
  lotCode: z.string().min(1).max(50),
  expireDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  effectiveFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  effectiveTo: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  supplier: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const updateQcLotSchema = createQcLotSchema.partial()

// QC Limits validation schemas
export const qcLimitSourceSchema = z.enum(['manufacturer', 'lab'])

const baseQcLimitSchema = z.object({
  testId: uuidSchema,
  levelId: uuidSchema,
  lotId: uuidSchema,
  deviceId: uuidSchema,
  mean: z.number(),
  sd: z.number().positive(),
  source: qcLimitSourceSchema,
})

export const createQcLimitSchema = baseQcLimitSchema.refine((data) => {
  // CV is auto-calculated: sd/mean*100
  return data.sd > 0 && data.mean !== 0
}, {
  message: 'SD must be positive and mean cannot be zero',
})

export const updateQcLimitSchema = baseQcLimitSchema.partial().omit({ testId: true, levelId: true, lotId: true, deviceId: true })

// Run Group validation schemas
export const createRunGroupSchema = z.object({
  deviceId: uuidSchema,
  testId: uuidSchema,
  runAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
})

// QC Run validation schemas
export const qcRunStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export const qcRunSideSchema = z.enum(['above', 'below', 'on'])

export const createQcRunSchema = z.object({
  groupId: uuidSchema.optional(),
  deviceId: uuidSchema,
  testId: uuidSchema,
  levelId: uuidSchema,
  lotId: uuidSchema,
  value: z.number(),
  unitId: uuidSchema,
  methodId: uuidSchema,
  performerId: uuidSchema,
  notes: z.string().max(500).optional(),
})

export const updateQcRunSchema = z.object({
  status: qcRunStatusSchema.optional(),
  notes: z.string().max(500).optional(),
})

// Violation validation schemas
export const violationSeveritySchema = z.enum(['warn', 'fail'])

export const createViolationSchema = z.object({
  runId: uuidSchema,
  ruleCode: z.string().min(1).max(20),
  severity: violationSeveritySchema,
  windowSize: z.number().int().positive().optional(),
  details: z.record(z.any()).optional(),
})

// CAPA validation schemas
export const capaStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected'])

export const createCapaSchema = z.object({
  runId: uuidSchema,
  rootCause: z.string().min(1).max(1000),
  action: z.string().min(1).max(1000),
  approverId: uuidSchema.optional(),
  status: capaStatusSchema.default('draft'),
})

export const updateCapaSchema = z.object({
  rootCause: z.string().max(1000).optional(),
  action: z.string().max(1000).optional(),
  approverId: uuidSchema.optional(),
  status: capaStatusSchema.optional(),
})

// Audit Log validation schemas
export const createAuditLogSchema = z.object({
  actorId: uuidSchema,
  action: z.string().min(1).max(100),
  entity: z.string().min(1).max(50),
  entityId: uuidSchema.optional(),
  diff: z.record(z.any()).optional(),
})

// Rule Profile validation schemas
export const ruleScopeSchema = z.enum(['global', 'test', 'device', 'device_test'])

export const createRuleProfileSchema = z.object({
  name: z.string().min(1).max(100),
  enabledRules: z.array(z.string()),
  scope: ruleScopeSchema,
})

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(2000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const dateRangeSchema = z.object({
  from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid from date format',
  }).optional(),
  to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid to date format',
  }).optional(),
})

export const qcRunFiltersSchema = z.object({
  deviceId: uuidSchema.optional(),
  testId: uuidSchema.optional(),
  levelId: uuidSchema.optional(),
  lotId: uuidSchema.optional(),
  status: qcRunStatusSchema.optional(),
  performerId: uuidSchema.optional(),
  approvalState: z.enum(['pending', 'approved', 'rejected']).optional(),
  autoResult: z.enum(['pass', 'warn', 'fail']).optional(),
  deviceCode: z.string().optional(),
  testCode: z.string().optional(),
  level: z.string().optional(),
}).merge(dateRangeSchema).merge(paginationSchema)

// Quick Entry form validation
export const quickEntrySchema = z.object({
  deviceId: uuidSchema,
  testId: uuidSchema,
  runAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  levels: z.array(z.object({
    levelId: uuidSchema,
    lotId: uuidSchema,
    value: z.number(),
    unitId: uuidSchema,
    methodId: uuidSchema,
    notes: z.string().max(500).optional(),
  })).min(1).max(3),
  performerId: uuidSchema,
})

// Report filters validation
export const reportFiltersSchema = z.object({
  deviceIds: z.array(uuidSchema).optional(),
  testIds: z.array(uuidSchema).optional(),
  groupBy: z.enum(['device', 'test', 'month', 'week']).default('month'),
}).merge(dateRangeSchema)

// Utility functions for validation
export function validateDecimal(value: string): number {
  const parsed = parseFloat(value.replace(',', '.'))
  if (isNaN(parsed)) {
    throw new Error('Invalid decimal number')
  }
  return parsed
}

export function sanitizeDecimalInput(input: string): string {
  // Ensure period is used as decimal separator
  return input.replace(',', '.')
}

// Export all schemas as a collection for easy access
export const schemas = {
  user: {
    create: createUserSchema,
    login: loginSchema,
  },
  device: {
    create: createDeviceSchema,
    update: updateDeviceSchema,
  },
  test: {
    create: createTestSchema,
    update: updateTestSchema,
  },
  unit: {
    create: createUnitSchema,
    update: updateUnitSchema,
  },
  method: {
    create: createMethodSchema,
    update: updateMethodSchema,
  },
  qcLevel: {
    create: createQcLevelSchema,
    update: updateQcLevelSchema,
  },
  qcLot: {
    create: createQcLotSchema,
    update: updateQcLotSchema,
  },
  qcLimit: {
    create: createQcLimitSchema,
    update: updateQcLimitSchema,
  },
  runGroup: {
    create: createRunGroupSchema,
  },
  qcRun: {
    create: createQcRunSchema,
    update: updateQcRunSchema,
    filters: qcRunFiltersSchema,
  },
  violation: {
    create: createViolationSchema,
  },
  capa: {
    create: createCapaSchema,
    update: updateCapaSchema,
  },
  auditLog: {
    create: createAuditLogSchema,
  },
  ruleProfile: {
    create: createRuleProfileSchema,
  },
  quickEntry: quickEntrySchema,
  reportFilters: reportFiltersSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
}