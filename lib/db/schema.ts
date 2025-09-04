import { pgTable, uuid, text, boolean, timestamp, numeric, date, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users table for authentication and authorization
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').$type<'tech' | 'supervisor' | 'qaqc' | 'admin'>().notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Devices/Machines table
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  model: text('model'),
  manufacturer: text('manufacturer'),
  department: text('department'),
  isActive: boolean('is_active').default(true),
})

// Units of measurement
export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  display: text('display').notNull(),
})

// Analytical methods
export const methods = pgTable('methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  name: text('name').notNull(),
})

// Tests/Analytes
export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  defaultUnitId: uuid('default_unit_id').references(() => units.id),
  defaultMethodId: uuid('default_method_id').references(() => methods.id),
  decimals: integer('decimals').default(2),
  isActive: boolean('is_active').default(true),
})

// QC Levels (L1, L2, L3) for each test
export const qcLevels = pgTable('qc_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').references(() => tests.id).notNull(),
  level: text('level').$type<'L1' | 'L2' | 'L3'>().notNull(),
  material: text('material'),
  isActive: boolean('is_active').default(true),
})

// QC Lots with expiration tracking
export const qcLots = pgTable('qc_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  levelId: uuid('level_id').references(() => qcLevels.id).notNull(),
  lotCode: text('lot_code').notNull(),
  expireDate: date('expire_date').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  supplier: text('supplier'),
  notes: text('notes'),
})

// QC Limits (Mean, SD, CV) for test x level x lot x device
export const qcLimits = pgTable('qc_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').references(() => tests.id).notNull(),
  levelId: uuid('level_id').references(() => qcLevels.id).notNull(),
  lotId: uuid('lot_id').references(() => qcLots.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  mean: numeric('mean', { precision: 12, scale: 4 }).notNull(),
  sd: numeric('sd', { precision: 12, scale: 4 }).notNull(),
  cv: numeric('cv', { precision: 6, scale: 2 }).notNull(), // Auto-computed: sd/mean*100
  source: text('source').$type<'manufacturer' | 'lab'>().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  uniqueConstraint: index('qc_limits_unique_idx').on(table.testId, table.levelId, table.lotId, table.deviceId),
}))

// Run Groups for multi-level QC entries at same time
export const runGroups = pgTable('run_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  testId: uuid('test_id').references(() => tests.id).notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
})

// Individual QC Runs
export const qcRuns = pgTable('qc_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => runGroups.id),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  testId: uuid('test_id').references(() => tests.id).notNull(),
  levelId: uuid('level_id').references(() => qcLevels.id).notNull(),
  lotId: uuid('lot_id').references(() => qcLots.id).notNull(),
  value: numeric('value', { precision: 14, scale: 4 }).notNull(),
  unitId: uuid('unit_id').references(() => units.id),
  methodId: uuid('method_id').references(() => methods.id),
  performerId: uuid('performer_id').references(() => users.id),
  status: text('status').$type<'pending' | 'accepted' | 'rejected'>().default('pending'),
  z: numeric('z', { precision: 10, scale: 3 }), // Z-score computed server-side
  side: text('side').$type<'above' | 'below' | 'on'>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  runsByFiltersIdx: index('qc_runs_filters_idx').on(table.testId, table.deviceId, table.levelId, table.lotId, table.createdAt),
  runsByStatusIdx: index('qc_runs_status_idx').on(table.status, table.createdAt),
}))

// Westgard Rule Violations
export const violations = pgTable('violations', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => qcRuns.id).notNull(),
  ruleCode: text('rule_code').notNull(), // '1-3s', '2-2s', 'R-4s', etc.
  severity: text('severity').$type<'warn' | 'fail'>().notNull(),
  windowSize: integer('window_size'),
  details: jsonb('details'), // Additional rule-specific details
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  violationsByRunIdx: index('violations_run_idx').on(table.runId, table.ruleCode),
}))

// CAPA (Corrective and Preventive Actions)
export const capa = pgTable('capa', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => qcRuns.id).notNull(),
  rootCause: text('root_cause'),
  action: text('action'),
  approverId: uuid('approver_id').references(() => users.id),
  status: text('status').$type<'draft' | 'submitted' | 'approved' | 'rejected'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Audit Log for compliance tracking
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  diff: jsonb('diff'), // Before/after changes
  at: timestamp('at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  auditByActorIdx: index('audit_log_actor_idx').on(table.actorId, table.at),
}))

// Rule Profiles for configuring Westgard rules
export const ruleProfiles = pgTable('rule_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  enabledRules: jsonb('enabled_rules').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Rule Profile Bindings for scope-specific rule application
export const ruleProfileBindings = pgTable('rule_profile_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => ruleProfiles.id, { onDelete: 'cascade' }).notNull(),
  scopeType: text('scope_type').$type<'global' | 'test' | 'device' | 'device_test'>().notNull(),
  testId: uuid('test_id').references(() => tests.id),
  deviceId: uuid('device_id').references(() => devices.id),
  activeFrom: timestamp('active_from', { withTimezone: true }).defaultNow(),
  activeTo: timestamp('active_to', { withTimezone: true }),
}, (table) => ({
  idxScope: index('idx_rpb_scope').on(table.scopeType, table.testId, table.deviceId, table.activeFrom, table.activeTo),
}))

// Relations for better type inference
export const usersRelations = relations(users, ({ many }) => ({
  performedRuns: many(qcRuns),
  createdLimits: many(qcLimits),
  approvedCapas: many(capa),
  auditLogs: many(auditLog),
}))

export const devicesRelations = relations(devices, ({ many }) => ({
  qcRuns: many(qcRuns),
  qcLimits: many(qcLimits),
  runGroups: many(runGroups),
}))

export const testsRelations = relations(tests, ({ many, one }) => ({
  qcRuns: many(qcRuns),
  qcLevels: many(qcLevels),
  qcLimits: many(qcLimits),
  runGroups: many(runGroups),
  defaultUnit: one(units, {
    fields: [tests.defaultUnitId],
    references: [units.id],
  }),
  defaultMethod: one(methods, {
    fields: [tests.defaultMethodId],
    references: [methods.id],
  }),
}))

export const qcLevelsRelations = relations(qcLevels, ({ many, one }) => ({
  test: one(tests, {
    fields: [qcLevels.testId],
    references: [tests.id],
  }),
  qcLots: many(qcLots),
  qcRuns: many(qcRuns),
  qcLimits: many(qcLimits),
}))

export const qcLotsRelations = relations(qcLots, ({ many, one }) => ({
  level: one(qcLevels, {
    fields: [qcLots.levelId],
    references: [qcLevels.id],
  }),
  qcRuns: many(qcRuns),
  qcLimits: many(qcLimits),
}))

export const qcLimitsRelations = relations(qcLimits, ({ one }) => ({
  test: one(tests, {
    fields: [qcLimits.testId],
    references: [tests.id],
  }),
  level: one(qcLevels, {
    fields: [qcLimits.levelId],
    references: [qcLevels.id],
  }),
  lot: one(qcLots, {
    fields: [qcLimits.lotId],
    references: [qcLots.id],
  }),
  device: one(devices, {
    fields: [qcLimits.deviceId],
    references: [devices.id],
  }),
  createdByUser: one(users, {
    fields: [qcLimits.createdBy],
    references: [users.id],
  }),
}))

export const runGroupsRelations = relations(runGroups, ({ many, one }) => ({
  device: one(devices, {
    fields: [runGroups.deviceId],
    references: [devices.id],
  }),
  test: one(tests, {
    fields: [runGroups.testId],
    references: [tests.id],
  }),
  createdByUser: one(users, {
    fields: [runGroups.createdBy],
    references: [users.id],
  }),
  qcRuns: many(qcRuns),
}))

export const qcRunsRelations = relations(qcRuns, ({ many, one }) => ({
  group: one(runGroups, {
    fields: [qcRuns.groupId],
    references: [runGroups.id],
  }),
  device: one(devices, {
    fields: [qcRuns.deviceId],
    references: [devices.id],
  }),
  test: one(tests, {
    fields: [qcRuns.testId],
    references: [tests.id],
  }),
  level: one(qcLevels, {
    fields: [qcRuns.levelId],
    references: [qcLevels.id],
  }),
  lot: one(qcLots, {
    fields: [qcRuns.lotId],
    references: [qcLots.id],
  }),
  unit: one(units, {
    fields: [qcRuns.unitId],
    references: [units.id],
  }),
  method: one(methods, {
    fields: [qcRuns.methodId],
    references: [methods.id],
  }),
  performer: one(users, {
    fields: [qcRuns.performerId],
    references: [users.id],
  }),
  violations: many(violations),
  capa: many(capa),
}))

export const violationsRelations = relations(violations, ({ one }) => ({
  qcRun: one(qcRuns, {
    fields: [violations.runId],
    references: [qcRuns.id],
  }),
}))

export const capaRelations = relations(capa, ({ one }) => ({
  qcRun: one(qcRuns, {
    fields: [capa.runId],
    references: [qcRuns.id],
  }),
  approver: one(users, {
    fields: [capa.approverId],
    references: [users.id],
  }),
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, {
    fields: [auditLog.actorId],
    references: [users.id],
  }),
}))

export const ruleProfilesRelations = relations(ruleProfiles, ({ many, one }) => ({
  createdByUser: one(users, {
    fields: [ruleProfiles.createdBy],
    references: [users.id],
  }),
  bindings: many(ruleProfileBindings),
}))

export const ruleProfileBindingsRelations = relations(ruleProfileBindings, ({ one }) => ({
  profile: one(ruleProfiles, {
    fields: [ruleProfileBindings.profileId],
    references: [ruleProfiles.id],
  }),
  test: one(tests, {
    fields: [ruleProfileBindings.testId],
    references: [tests.id],
  }),
  device: one(devices, {
    fields: [ruleProfileBindings.deviceId],
    references: [devices.id],
  }),
}))

// Export types for use in the application
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Device = typeof devices.$inferSelect
export type NewDevice = typeof devices.$inferInsert
export type Test = typeof tests.$inferSelect
export type NewTest = typeof tests.$inferInsert
export type QcLevel = typeof qcLevels.$inferSelect
export type NewQcLevel = typeof qcLevels.$inferInsert
export type QcLot = typeof qcLots.$inferSelect
export type NewQcLot = typeof qcLots.$inferInsert
export type QcLimit = typeof qcLimits.$inferSelect
export type NewQcLimit = typeof qcLimits.$inferInsert
export type RunGroup = typeof runGroups.$inferSelect
export type NewRunGroup = typeof runGroups.$inferInsert
export type QcRun = typeof qcRuns.$inferSelect
export type NewQcRun = typeof qcRuns.$inferInsert
export type Violation = typeof violations.$inferSelect
export type NewViolation = typeof violations.$inferInsert
export type Capa = typeof capa.$inferSelect
export type NewCapa = typeof capa.$inferInsert
export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
export type RuleProfile = typeof ruleProfiles.$inferSelect
export type NewRuleProfile = typeof ruleProfiles.$inferInsert
export type RuleProfileBinding = typeof ruleProfileBindings.$inferSelect
export type NewRuleProfileBinding = typeof ruleProfileBindings.$inferInsert
