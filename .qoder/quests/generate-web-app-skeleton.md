# C-Lab IQC Pro Web Application Skeleton Design

## Overview

C-Lab IQC Pro is a web-based Clinical Laboratory Internal Quality Control management system designed to automate Levey-Jennings charting and Westgard rule evaluation for laboratory quality assurance. The system provides real-time QC data entry, automated rule violation detection, CAPA management, and comprehensive reporting capabilities.

### Core Objectives
- Standardize IQC workflows with automated Mean/SD calculations and L-J chart generation
- Real-time Westgard rule evaluation with visual alerts (red/yellow/green status)
- Centralized QC data storage across multiple instruments, tests, and QC levels
- Role-based access control for laboratory personnel
- Audit trail compliance for ISO 15189 requirements

### Target Users
- **Laboratory Technicians (tech)**: QC data entry and chart viewing
- **Supervisors**: Run approval/rejection and CAPA management  
- **Quality Assurance (qaqc)**: Reporting and rule configuration
- **Administrators (admin)**: System configuration and user management

## Technology Stack & Dependencies

### Frontend Stack
- **Next.js 14+** with App Router and TypeScript
- **Tailwind CSS** for styling with Inter font
- **TanStack Query v5** for server state management
- **Recharts** for Levey-Jennings chart visualization
- **Zod** for client-side validation

### Backend Stack
- **Next.js API Routes** with Node.js runtime
- **NextAuth** with Credentials provider for JWT sessions
- **Supabase Postgres** database (no RLS, API-level authorization)
- **Drizzle ORM** with drizzle-kit for migrations
- **bcrypt** for password hashing

### Additional Libraries
- **SheetJS (xlsx)** for Excel import/export
- **pg** for PostgreSQL connection with Supabase pooling

### Environment Configuration
```env
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_SECRET=random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Frontend Architecture

### Component Hierarchy
```
App Layout
├── HeaderNav
│   ├── Logo
│   ├── Navigation Menu
│   └── User Avatar Dropdown
├── Dashboard
│   ├── StatusCards
│   ├── RecentRunsTable
│   └── QuickActions
├── Quick Entry
│   └── QuickEntryForm
│       ├── DeviceSelector
│       ├── TestSelector
│       ├── QCLevelInputs
│       └── SubmitButton
├── L-J Chart
│   └── LjChart
│       ├── FilterControls
│       ├── ChartContainer
│       └── ChartTooltip
└── Reports
    ├── SummaryReports
    └── ExportControls
```

### State Management Strategy
- **Server State**: TanStack Query for API data caching and synchronization
- **Client State**: React useState/useReducer for UI state
- **Form State**: Controlled components with Zod validation
- **Cache Strategy**: Aggressive caching for master data, real-time updates for QC runs

### Routing Structure
```
/dashboard - Main overview page
/quick-entry - QC data entry form
/lj-chart - Interactive Levey-Jennings charts
/reports - Summary reports and exports
/settings - System configuration (admin only)
```

### UI Design System
- **Layout**: Header navigation (no sidebar)
- **Typography**: Inter font family via next/font/google
- **Border Radius**: rounded-2xl for consistent styling
- **Shadows**: shadow-md for elevation
- **Spacing**: p-3 minimum padding
- **Decimal Format**: Period (.) as decimal separator

## Backend Architecture

### API Endpoints Reference

#### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth authentication handlers

#### Master Data Management
- `GET/POST /api/devices` - Device CRUD operations
- `GET/POST /api/tests` - Test/analyte management
- `GET/POST /api/units` - Unit of measurement management
- `GET/POST /api/methods` - Analytical method management

#### QC Configuration
- `POST /api/qc/limits` - QC limit configuration (Mean, SD, CV)
- `GET/POST /api/qc/lots` - QC lot management with expiration tracking
- `GET/POST /api/qc/levels` - QC level configuration (L1/L2/L3)

#### QC Operations
- `POST /api/qc/run-groups` - Create run group for multi-level entries
- `POST /api/qc/runs` - Main QC data entry with Westgard evaluation
- `GET /api/qc/runs` - Retrieve QC data for charts and tables
- `POST /api/qc/capa` - CAPA management for rejected runs

#### Reporting
- `GET /api/reports/summary` - Violation statistics by device/test/month
- `GET /api/export/excel` - Excel export functionality

#### System Configuration
- `GET/POST /api/rule-profiles` - Westgard rule configuration

### Request/Response Schema

#### POST /api/qc/runs
```typescript
// Request
{
  groupId?: string,
  deviceId: string,
  testId: string, 
  levelId: string,
  lotId: string,
  value: number,
  unitId: string,
  methodId: string,
  performerId: string,
  notes?: string
}

// Response
{
  id: string,
  status: 'accepted' | 'rejected' | 'pending',
  z: number,
  violations: Array<{
    ruleCode: string,
    severity: 'warn' | 'fail',
    details: object
  }>
}
```

#### GET /api/qc/runs
```typescript
// Query Parameters
{
  deviceId?: string,
  testId?: string,
  levelId?: string,
  lotId?: string,
  from?: string, // ISO date
  to?: string,   // ISO date
  limit?: number,
  offset?: number
}
```

### Authentication Requirements
All API routes require authentication via NextAuth JWT session. Role-based authorization implemented at API handler level:
- **tech**: Can create QC runs, view own data
- **supervisor**: Can approve/reject runs, manage CAPA
- **qaqc**: Can access reports, configure rules
- **admin**: Full system access

## Data Models & ORM Mapping

### Core Tables Schema

#### Users & Authentication
```sql
users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('tech','supervisor','qaqc','admin')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

#### Master Data
```sql
devices (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  manufacturer TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true
)

tests (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  default_unit_id UUID REFERENCES units(id),
  default_method_id UUID REFERENCES methods(id),
  decimals INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true
)

units (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  display TEXT NOT NULL
)

methods (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL
)
```

#### QC Configuration
```sql
qc_levels (
  id UUID PRIMARY KEY,
  test_id UUID REFERENCES tests(id),
  level TEXT CHECK (level IN ('L1','L2','L3')),
  material TEXT,
  is_active BOOLEAN DEFAULT true
)

qc_lots (
  id UUID PRIMARY KEY,
  level_id UUID REFERENCES qc_levels(id),
  lot_code TEXT NOT NULL,
  expire_date DATE NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  supplier TEXT,
  notes TEXT
)

qc_limits (
  id UUID PRIMARY KEY,
  test_id UUID REFERENCES tests(id),
  level_id UUID REFERENCES qc_levels(id),
  lot_id UUID REFERENCES qc_lots(id),
  device_id UUID REFERENCES devices(id),
  mean NUMERIC(12,4) NOT NULL,
  sd NUMERIC(12,4) NOT NULL,
  cv NUMERIC(6,2) NOT NULL, -- Auto-computed: sd/mean*100
  source TEXT CHECK (source IN ('manufacturer','lab')),
  created_by UUID REFERENCES users(id),
  UNIQUE(test_id, level_id, lot_id, device_id)
)
```

#### QC Operations
```sql
run_groups (
  id UUID PRIMARY KEY,
  device_id UUID REFERENCES devices(id),
  test_id UUID REFERENCES tests(id),
  run_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id)
)

qc_runs (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES run_groups(id),
  device_id UUID REFERENCES devices(id),
  test_id UUID REFERENCES tests(id),
  level_id UUID REFERENCES qc_levels(id),
  lot_id UUID REFERENCES qc_lots(id),
  value NUMERIC(14,4) NOT NULL,
  unit_id UUID REFERENCES units(id),
  method_id UUID REFERENCES methods(id),
  performer_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
  z NUMERIC(10,3), -- Z-score computed server-side
  side TEXT CHECK (side IN ('above','below','on')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

violations (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES qc_runs(id),
  rule_code TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('warn','fail')),
  window_size INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)

capa (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES qc_runs(id),
  root_cause TEXT,
  action TEXT,
  approver_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('draft','submitted','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
)

audit_log (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  diff JSONB,
  at TIMESTAMPTZ DEFAULT now()
)
```

### Key Indexes
```sql
CREATE INDEX ON qc_runs(test_id, device_id, level_id, lot_id, created_at);
CREATE INDEX ON violations(run_id, rule_code);
CREATE INDEX ON audit_log(actor_id, at);
CREATE INDEX ON qc_runs(status, created_at);
```

### Drizzle ORM Schema Structure
```typescript
// lib/db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').$type<'tech'|'supervisor'|'qaqc'|'admin'>().notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', {withTimezone: true}).defaultNow()
});

export const qcRuns = pgTable('qc_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => runGroups.id),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  testId: uuid('test_id').references(() => tests.id).notNull(),
  levelId: uuid('level_id').references(() => qcLevels.id).notNull(),
  lotId: uuid('lot_id').references(() => qcLots.id).notNull(),
  value: numeric('value', {precision: 14, scale: 4}).notNull(),
  status: text('status').$type<'pending'|'accepted'|'rejected'>().default('pending'),
  z: numeric('z', {precision: 10, scale: 3}),
  side: text('side').$type<'above'|'below'|'on'>(),
  createdAt: timestamp('created_at', {withTimezone: true}).defaultNow()
});
```

## Business Logic Layer

### Westgard Rules Engine Architecture

The core business logic is implemented in the Westgard Rules Engine, responsible for:
- Z-score calculation
- Rule violation detection
- Status determination
- Audit trail generation

#### Rule Evaluation Flow
```mermaid
graph TD
    A[QC Run Submitted] --> B[Calculate Z-score]
    B --> C[Load Historical Window]
    C --> D[Load Peer Levels in Group]
    D --> E[Apply Within-Level Rules]
    E --> F[Apply Across-Level Rules]
    F --> G[Determine Final Status]
    G --> H[Save Violations]
    H --> I[Return Result]
```

#### Supported Westgard Rules

**Within-Level Rules** (applied to single QC level history):
- **1-3s**: Single point beyond ±3SD (fail)
- **1-2s**: Single point beyond ±2SD (warning)
- **2-2s**: Two consecutive points beyond same ±2SD (fail)
- **4-1s**: Four consecutive points beyond same ±1SD (fail)
- **10x**: Ten consecutive points on same side of mean (fail)
- **7T**: Seven consecutive points with increasing/decreasing trend (fail)

**Across-Level Rules** (applied within run group):
- **R-4s**: Range between levels exceeds 4SD (fail)
- **2of3-2s**: Two of three levels beyond ±2SD (fail)

#### Z-Score Calculation
```typescript
const calculateZScore = (value: number, mean: number, sd: number): number => {
  return (value - mean) / sd;
};

const determineSide = (z: number): 'above' | 'below' | 'on' => {
  if (z > 0.05) return 'above';
  if (z < -0.05) return 'below';
  return 'on';
};
```

#### Rule Implementation Pseudocode
```typescript
const evaluateWithinLevelRules = (currentZ: number, historicalZ: number[]) => {
  const violations: Violation[] = [];
  
  // 1-3s rule
  if (Math.abs(currentZ) > 3) {
    violations.push({rule: '1-3s', severity: 'fail'});
  }
  
  // 1-2s rule (warning)
  if (Math.abs(currentZ) > 2) {
    violations.push({rule: '1-2s', severity: 'warn'});
  }
  
  // 2-2s rule
  if (historicalZ.length > 0) {
    const lastZ = historicalZ[0];
    if (sameSide(currentZ, lastZ) && 
        Math.abs(currentZ) > 2 && 
        Math.abs(lastZ) > 2) {
      violations.push({rule: '2-2s', severity: 'fail'});
    }
  }
  
  // Additional rules...
  return violations;
};
```

### CAPA Management Logic
When a QC run is rejected (contains fail-level violations):
1. System automatically creates draft CAPA record
2. Supervisor must complete root cause analysis
3. Corrective action plan required before run acceptance
4. Approval workflow for significant CAPAs
5. Audit trail for all CAPA activities

## Data Flow Between Layers

### QC Data Entry Flow
```mermaid
sequenceDiagram
    participant UI as Quick Entry Form
    participant API as API Route
    participant WE as Westgard Engine
    participant DB as Database
    
    UI->>API: POST /api/qc/runs
    API->>DB: Validate lot expiration
    DB-->>API: Lot valid
    API->>WE: Evaluate run
    WE->>DB: Load QC limits
    WE->>DB: Load historical data
    WE->>WE: Calculate Z-score
    WE->>WE: Apply Westgard rules
    WE-->>API: Return status + violations
    API->>DB: Save run + violations (transaction)
    DB-->>API: Saved successfully
    API-->>UI: Return result
    UI->>UI: Update cache & display status
```

### Chart Data Retrieval Flow
```mermaid
sequenceDiagram
    participant Chart as L-J Chart
    participant Query as TanStack Query
    participant API as API Route
    participant DB as Database
    
    Chart->>Query: Request chart data
    Query->>API: GET /api/qc/runs?filters
    API->>DB: Query with indexes
    DB-->>API: Return run data
    API->>API: Transform for chart
    API-->>Query: Return chart points
    Query->>Query: Cache with staleTime
    Query-->>Chart: Render data
```

### Real-time Updates Strategy
- **TanStack Query**: Automatic cache invalidation on mutations
- **Optimistic Updates**: Immediate UI feedback for data entry
- **Background Refresh**: Periodic cache revalidation for critical data
- **Manual Refresh**: User-triggered data refresh capability

## Implementation Details

### Project Structure
```
c-lab-iqc-pro/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── quick-entry/
│   │   │   └── page.tsx
│   │   ├── lj-chart/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── qc/
│   │   │   ├── runs/
│   │   │   │   └── route.ts
│   │   │   ├── run-groups/
│   │   │   │   └── route.ts
│   │   │   ├── limits/
│   │   │   │   └── route.ts
│   │   │   └── lots/
│   │   │       └── route.ts
│   │   ├── reports/
│   │   │   └── summary/
│   │   │       └── route.ts
│   │   └── export/
│   │       └── excel/
│   │           └── route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── HeaderNav.tsx
│   ├── QuickEntryForm.tsx
│   ├── LjChart.tsx
│   ├── StatusCards.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── migrations/
│   ├── auth/
│   │   └── options.ts
│   ├── qc/
│   │   ├── westgardEngine.ts
│   │   └── validation.ts
│   └── utils.ts
├── package.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.js
└── .env.example
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tanstack/react-query": "^5.0.0",
    "next-auth": "^4.24.0",
    "bcrypt": "^5.1.0",
    "drizzle-orm": "^0.29.0",
    "drizzle-kit": "^0.20.0",
    "pg": "^8.11.0",
    "recharts": "^2.8.0",
    "zod": "^3.22.0",
    "xlsx": "^0.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/pg": "^8.10.0"
  }
}
```

### Configuration Files

#### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
}

module.exports = nextConfig
```

#### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
export default config
```

#### drizzle.config.ts
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Key Component Implementations

#### HeaderNav Component
```typescript
// components/HeaderNav.tsx
'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function HeaderNav() {
  const { data: session } = useSession()

  return (
    <header className={`bg-white shadow-md ${inter.className}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              C-Lab IQC Pro
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/quick-entry" className="text-gray-700 hover:text-blue-600">
              Quick Entry
            </Link>
            <Link href="/lj-chart" className="text-gray-700 hover:text-blue-600">
              L-J Chart
            </Link>
            <Link href="/reports" className="text-gray-700 hover:text-blue-600">
              Reports
            </Link>
            {session?.user?.role === 'admin' && (
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">
                Settings
              </Link>
            )}
          </div>
          
          <div className="flex items-center">
            <div className="relative">
              <button 
                className="flex items-center space-x-2 p-2 rounded-2xl hover:bg-gray-100"
                onClick={() => signOut()}
              >
                <span className="text-sm text-gray-700">{session?.user?.name}</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  {session?.user?.name?.charAt(0)}
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
```

#### L-J Chart Component Structure
```typescript
// components/LjChart.tsx
'use client'

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ReferenceArea,
  ResponsiveContainer,
  Brush 
} from 'recharts'

interface LjChartProps {
  data: QcRunPoint[]
  limits: QcLimits
  onFilterChange: (filters: ChartFilters) => void
}

export default function LjChart({ data, limits, onFilterChange }: LjChartProps) {
  const { mean, sd } = limits

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <div className="mb-4">
        {/* Filter Controls */}
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
          
          {/* Reference Areas for ±3SD */}
          <ReferenceArea 
            y1={mean - 3*sd} 
            y2={mean + 3*sd} 
            fill="#fee2e2" 
            fillOpacity={0.3} 
          />
          
          {/* Reference Lines for Mean and SD boundaries */}
          <ReferenceLine y={mean} stroke="#6b7280" strokeDasharray="4 2" />
          <ReferenceLine y={mean + sd} stroke="#10b981" strokeWidth={1} />
          <ReferenceLine y={mean - sd} stroke="#10b981" strokeWidth={1} />
          <ReferenceLine y={mean + 2*sd} stroke="#f59e0b" strokeWidth={1} />
          <ReferenceLine y={mean - 2*sd} stroke="#f59e0b" strokeWidth={1} />
          <ReferenceLine y={mean + 3*sd} stroke="#ef4444" strokeWidth={2} />
          <ReferenceLine y={mean - 3*sd} stroke="#ef4444" strokeWidth={2} />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<ColoredDot />}
            connectNulls={false}
          />
          
          <Tooltip content={<LjTooltip />} />
          <Brush dataKey="date" height={30} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Authentication Setup
```typescript
// lib/auth/options.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username))
          .limit(1)

        if (!user[0] || !user[0].isActive) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user[0].passwordHash
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user[0].id,
          name: user[0].name,
          username: user[0].username,
          role: user[0].role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role
        token.username = user.username
      }
      return token
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub!
      session.user.role = token.role as string
      session.user.username = token.username as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
```

### API Route Implementation Example
```typescript
// app/api/qc/runs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { evaluateWestgardRules } from '@/lib/qc/westgardEngine'
import { runEntrySchema } from '@/lib/qc/validation'
import { db } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !['tech', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = runEntrySchema.parse(body)
    
    // Evaluate Westgard rules
    const evaluation = await evaluateWestgardRules({
      ...validatedData,
      performerId: session.user.id
    })
    
    // Save in transaction
    const result = await db.transaction(async (tx) => {
      const run = await tx.insert(qcRuns).values(evaluation.run).returning()
      
      if (evaluation.violations.length > 0) {
        await tx.insert(violations).values(
          evaluation.violations.map(v => ({ ...v, runId: run[0].id }))
        )
      }
      
      return { run: run[0], violations: evaluation.violations }
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('QC run creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
```

## Testing Strategy

### Unit Testing
- **Westgard Rules**: Comprehensive test suite for each rule with edge cases
- **Z-Score Calculations**: Precision testing with various numeric ranges
- **Validation Schemas**: Zod schema validation with invalid inputs
- **Utility Functions**: Date/time handling, number formatting

### Integration Testing  
- **API Routes**: Full request/response cycle testing
- **Database Transactions**: Rollback behavior on failures
- **Authentication Flow**: Session management and role authorization

### Component Testing
- **Form Validation**: User input validation and error handling
- **Chart Rendering**: Data visualization accuracy
- **Navigation**: Role-based route access

### Performance Testing
- **Chart Rendering**: < 1 second for 12-18 months of data
- **Data Entry**: < 3 seconds per QC run submission
- **Database Queries**: Optimized with proper indexing

### Acceptance Criteria
1. L-J chart renders with proper Mean and ±1/±2/±3SD reference lines
2. Westgard rule evaluation returns correct violations for test fixtures
3. Quick Entry form allows three-level submission within 60 seconds
4. Role-based access control prevents unauthorized operations
5. Audit trail captures all data modifications with user attribution