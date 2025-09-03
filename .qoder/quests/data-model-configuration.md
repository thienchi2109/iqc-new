# Data Model Configuration - Westgard Rule Profiles Implementation

## Goal

Patch existing C-Lab IQC Pro app to add configurable Westgard rules via rule profiles, without breaking current behavior.

## Assumptions

### Technology Stack
- Next.js 14 App Router + TypeScript
- NextAuth Credentials + JWT
- Drizzle ORM + drizzle-kit
- Postgres (Supabase)
- TanStack Query v5
- Recharts
- Zod

### Database Conventions
- `users` table has 'username' (no 'email' field)
- `devices` table has no 'serial' column
- `qc_runs.status` is text: 'pending'|'accepted'|'rejected'

### Timezone & UI
- Format dates in Asia/Ho_Chi_Minh at UI level

## Feature Flag

### Environment Variable
- **Variable**: `USE_PROFILE_CONFIG`
- **Default**: true
- **Wiring**: If false, WestgardEngine falls back to hard-coded MVP rules

## Implementation Tasks

### Task 1: DB_DRIZZLE_MIGRATION
**Type**: codegen  
**Path**: `db/migrations/2025-09-03_add_rule_profiles.ts`  
**Language**: typescript

```typescript
// Drizzle migration: rule_profiles + rule_profile_bindings
import { sql } from 'drizzle-orm';

export const up = async (db) => {
  await db.execute(sql`
    create table if not exists rule_profiles(
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      enabled_rules jsonb not null,
      created_by uuid references users(id),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists rule_profile_bindings(
      id uuid primary key default gen_random_uuid(),
      profile_id uuid not null references rule_profiles(id) on delete cascade,
      scope_type text not null check (scope_type in ('global','test','device','device_test')),
      test_id uuid null references tests(id),
      device_id uuid null references devices(id),
      active_from timestamptz default now(),
      active_to timestamptz null
    );
    
    create index if not exists idx_rpb_scope
      on rule_profile_bindings(scope_type, test_id, device_id, active_from, active_to);
  `);
};

export const down = async (db) => {
  await db.execute(sql`
    drop table if exists rule_profile_bindings; 
    drop table if exists rule_profiles;
  `);
};
```

### Task 2: DB_SQL_MIGRATION
**Type**: codegen  
**Path**: `db/sql/2025-09-03_add_rule_profiles.sql`  
**Language**: sql

```sql
create extension if not exists "pgcrypto";

create table if not exists rule_profiles(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  enabled_rules jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rule_profile_bindings(
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references rule_profiles(id) on delete cascade,
  scope_type text not null check (scope_type in ('global','test','device','device_test')),
  test_id uuid null references tests(id),
  device_id uuid null references devices(id),
  active_from timestamptz default now(),
  active_to timestamptz null
);

create index if not exists idx_rpb_scope 
  on rule_profile_bindings(scope_type, test_id, device_id, active_from, active_to);
```

### Task 3: DB_SCHEMA_DRIZZLE
**Type**: codegen  
**Path**: `lib/db/schema.rule-profiles.ts`  
**Language**: typescript

```typescript
import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users, tests, devices } from './schema';

export const ruleProfiles = pgTable('rule_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  enabledRules: jsonb('enabled_rules').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const ruleProfileBindings = pgTable('rule_profile_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => ruleProfiles.id).notNull(),
  scopeType: text('scope_type').$type<'global'|'test'|'device'|'device_test'>().notNull(),
  testId: uuid('test_id').references(() => tests.id),
  deviceId: uuid('device_id').references(() => devices.id),
  activeFrom: timestamp('active_from', { withTimezone: true }).defaultNow(),
  activeTo: timestamp('active_to', { withTimezone: true }),
}, (t) => ({ 
  idxScope: index('idx_rpb_scope').on(t.scopeType, t.testId, t.deviceId, t.activeFrom, t.activeTo) 
}));
```

### Task 4: SEED_DEFAULT_PROFILE_SQL
**Type**: codegen  
**Path**: `db/sql/2025-09-03_seed_default_rule_profile.sql`  
**Language**: sql

```sql
insert into rule_profiles (name, enabled_rules, created_by)
values (
  'Default Global (MVP)',
  '{
    "window_size_default": 12,
    "rules": {
      "1-3s": {"enabled": true,  "severity": "fail"},
      "1-2s": {"enabled": true,  "severity": "warn"},
      "2-2s": {"enabled": true},
      "R-4s": {"enabled": true, "within_run_across_levels": true, "across_runs": true, "delta_sd": 4},
      "4-1s": {"enabled": true, "threshold_sd": 1, "window": 4},
      "10x":  {"enabled": true, "n": 10},
      "7T":   {"enabled": true, "n": 7},
      "2of3-2s": {"enabled": false, "threshold_sd": 2, "window": 3},
      "3-1s":   {"enabled": false, "threshold_sd": 1, "window": 3},
      "6x":     {"enabled": false, "n": 6}
    }
  }'::jsonb,
  (select id from users where role in ('qaqc','admin') order by created_at limit 1)
) 
on conflict (name) do nothing;

insert into rule_profile_bindings (profile_id, scope_type)
select id, 'global' from rule_profiles where name='Default Global (MVP)'
on conflict do nothing;
```

### Task 5: ENV_FLAG
**Type**: edit  
**Path**: `.env.example`

```env
USE_PROFILE_CONFIG=true
```

### Task 6: BACKEND_RESOLVE
**Type**: codegen  
**Path**: `lib/qc/resolveProfile.ts`  
**Language**: typescript

```typescript
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export type RulesConfig = any; // tighten later with Zod

const DEFAULT_RULES: RulesConfig = { 
  window_size_default: 12, 
  rules: { 
    '1-3s': {enabled:true, severity:'fail'}, 
    '1-2s': {enabled:true, severity:'warn'}, 
    '2-2s': {enabled:true}, 
    'R-4s': {enabled:true, within_run_across_levels:true, across_runs:true, delta_sd:4}, 
    '4-1s': {enabled:true, threshold_sd:1, window:4}, 
    '10x': {enabled:true, n:10}, 
    '7T': {enabled:true, n:7} 
  } 
};

export async function resolveProfile({ 
  deviceId, 
  testId, 
  at 
}: { 
  deviceId: string; 
  testId: string; 
  at: Date; 
}): Promise<RulesConfig> {
  if (process.env.USE_PROFILE_CONFIG !== 'true') return DEFAULT_RULES;
  
  const rows = await db.execute(sql`
    select p.enabled_rules, b.scope_type, b.active_from
    from rule_profile_bindings b
    join rule_profiles p on p.id = b.profile_id
    where (b.scope_type='device_test' and b.device_id=${deviceId} and b.test_id=${testId})
       or (b.scope_type='test' and b.test_id=${testId})
       or (b.scope_type='device' and b.device_id=${deviceId})
       or (b.scope_type='global')
      and (b.active_from is null or b.active_from <= ${at})
      and (b.active_to   is null or b.active_to   >= ${at})
    order by case b.scope_type 
        when 'device_test' then 1 
        when 'test' then 2 
        when 'device' then 3 
        else 4 
      end,
      coalesce(b.active_from, 'epoch') desc
    limit 1;
  `);
  
  // @ts-ignore drizzle returns .rows/.[0]
  const cfg = rows?.rows?.[0]?.enabled_rules ?? rows?.[0]?.enabled_rules;
  return (cfg ?? DEFAULT_RULES) as RulesConfig;
}
```

### Task 7: BACKEND_ENGINE_PATCH
**Type**: edit  
**Path**: `lib/qc/westgardEngine.ts`  
**Snippet after**: `export async function evaluateRun(input: EvaluateRunInput) {`

```typescript
  const cfg = await resolveProfile({ 
    deviceId: input.deviceId, 
    testId: input.testId, 
    at: input.runAt 
  });
  
  // pass cfg into rule checks; example for 1-2s
  const oneTwo = cfg?.rules?.['1-2s'];
  if (oneTwo?.enabled && Math.abs(z) > 2) {
    addViolation('1-2s', oneTwo.severity ?? 'warn');
  }
  
  // similarly gate other rules by cfg.rules[...]
```
## API Routes

### Task 8: API_ROUTES
**Type**: codegen  
**Path**: `app/api/rule-profiles/ROUTES.md`  
**Language**: markdown

```markdown
### Endpoints
- GET /api/rule-profiles
- POST /api/rule-profiles
- PUT /api/rule-profiles/:id
- POST /api/rule-profiles/:id/bindings
- GET /api/rule-profiles/resolve?deviceId=&testId=&at=

All endpoints require role: 'admin' or 'qaqc'. Use NextAuth session guard and audit_log.
```

### Task 9: API_ROUTE_LIST
**Type**: codegen  
**Path**: `app/api/rule-profiles/route.ts`  
**Language**: typescript

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET() {
  const rows = await db.execute(
    "select id, name, enabled_rules, updated_at from rule_profiles order by updated_at desc"
  );
  return NextResponse.json(rows.rows ?? rows);
}
```

### Task 10: API_ROUTE_CREATE
**Type**: codegen  
**Path**: `app/api/rule-profiles/create/route.ts`  
**Language**: typescript

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const Schema = z.object({ 
  name: z.string().min(3), 
  enabled_rules: z.any() 
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.parse(body);
  
  const r = await db.execute({ 
    text: 'insert into rule_profiles (name, enabled_rules) values ($1,$2) returning *', 
    args: [parsed.name, parsed.enabled_rules] 
  });
  
  return NextResponse.json(r.rows?.[0] ?? r[0]);
}
```

### Task 11: API_ROUTE_UPDATE
**Type**: codegen  
**Path**: `app/api/rule-profiles/[id]/route.ts`  
**Language**: typescript

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function PUT(
  _: Request, 
  { params }: { params: { id: string }}
) {
  const body = await new Response(_!.body).json();
  
  const r = await db.execute({ 
    text: 'update rule_profiles set enabled_rules=$1, updated_at=now() where id=$2 returning *', 
    args: [body.enabled_rules, params.id] 
  });
  
  return NextResponse.json(r.rows?.[0] ?? r[0]);
}
```

### Task 12: API_ROUTE_BIND
**Type**: codegen  
**Path**: `app/api/rule-profiles/[id]/bindings/route.ts`  
**Language**: typescript

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function POST(
  req: Request, 
  { params }: { params: { id: string }}
) {
  const b = await req.json();
  
  const r = await db.execute({ 
    text: 'insert into rule_profile_bindings (profile_id, scope_type, test_id, device_id, active_from, active_to) values ($1,$2,$3,$4,$5,$6) returning *', 
    args: [
      params.id, 
      b.scope_type, 
      b.test_id ?? null, 
      b.device_id ?? null, 
      b.active_from ?? null, 
      b.active_to ?? null
    ] 
  });
  
  return NextResponse.json(r.rows?.[0] ?? r[0]);
}
```

### Task 13: API_ROUTE_RESOLVE
**Type**: codegen  
**Path**: `app/api/rule-profiles/resolve/route.ts`  
**Language**: typescript

```typescript
import { NextResponse } from 'next/server';
import { resolveProfile } from '@/lib/qc/resolveProfile';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId')!;
  const testId = searchParams.get('testId')!;
  const at = new Date(searchParams.get('at') ?? Date.now());
  
  const cfg = await resolveProfile({ deviceId, testId, at });
  return NextResponse.json(cfg);
}
```

## Settings UI

### Task 14: SETTINGS_UI
**Type**: codegen  
**Path**: `app/(app)/settings/westgard/page.tsx`  
**Language**: tsx

```tsx
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function WestgardSettings() {
  /* Fetch list */
  return (
    <div className='p-4'>
      <h1 className='text-xl font-semibold'>Westgard Rule Profiles</h1>
      <div className='mt-4'>
        <Link className='btn' href='/settings/westgard/new'>
          New Profile
        </Link>
      </div>
    </div>
  );
}
```

### Task 15: SETTINGS_UI_EDIT
**Type**: codegen  
**Path**: `app/(app)/settings/westgard/[id]/page.tsx`  
**Language**: tsx

```tsx
/* Form with toggles for rules + bindings editor (simple JSON textarea acceptable for MVP) */
```

## Testing Requirements

### Unit Tests
- **evaluateRun respects cfg.rules['1-2s'].severity = 'warn' vs 'fail'**
- **R-4s only if cfg.rules['R-4s'].within_run_across_levels = true**

### Integration Tests
- **POST /api/rule-profiles, bind device_test; resolve returns that profile**

### Back-compatibility Tests
- **set USE_PROFILE_CONFIG=false → engine behavior identical to old MVP**

## Rollback Strategy

### Production Issue Response
- **If production issue: set USE_PROFILE_CONFIG=false and redeploy → engine ignores profiles**
- **Revert migration by running 'down' or drop tables rule_profile_* (no impact to qc_* tables)**

## Acceptance Criteria

✅ **When USE_PROFILE_CONFIG=true and no bindings exist, engine uses 'Default Global (MVP)'**

✅ **Binding a device_test profile with 2of3-2s enabled causes engine to flag matching sequences**

✅ **Settings page lists profiles, allows edit JSON and create bindings**

✅ **API resolve returns correct profile per priority: device_test > test > device > global**

## Deliverables

1. ✅ **Drizzle migration file + SQL migration file**
2. ✅ **New Drizzle schema for rule profiles**
3. ✅ **Seed SQL for Default Global profile + binding**
4. ✅ **Resolve function + engine patch gated by feature flag**
5. ✅ **API routes for profiles, bindings, resolve**
6. ✅ **Basic Settings UI pages**