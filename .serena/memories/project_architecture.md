# Project Architecture and Structure

## Directory Structure
```
/app                    # Next.js App Router
├── (app)/              # Protected routes (auth required)
│   ├── dashboard/      # QC status overview
│   ├── quick-entry/    # QC data entry forms  
│   ├── lj-chart/       # Levey-Jennings charts
│   └── reports/        # Analytics and reports
├── api/                # API routes
│   ├── auth/           # NextAuth configuration
│   ├── devices/        # Laboratory instruments
│   ├── tests/          # Test/analyte definitions
│   ├── qc/             # QC operations (core business logic)
│   ├── units/          # Units of measurement
│   └── methods/        # Analytical methods
└── auth/               # Authentication pages

/lib                    # Business logic and utilities
├── db/                 # Database client and schema
├── auth/               # Authentication configuration
└── qc/                 # QC business logic (Westgard engine)

/components             # React components
├── ui/                 # Base UI components (Button, Card, etc)
└── [features]          # Feature-specific components

/scripts                # Utility scripts
└── seed.ts             # Database seeding

/types                  # TypeScript type definitions
```

## Database Architecture 
**Central Entity**: `qc_runs` - Individual QC measurements

**Master Data Flow**:
`users` → `devices` → `tests` → `qc_levels` → `qc_lots` → `qc_limits`

**QC Data Flow**:
`run_groups` → `qc_runs` → `violations` → `capa` → `audit_log`

## Key Business Logic
- **Westgard Rules Engine** (`/lib/qc/westgardEngine.ts`): Core QC evaluation
- **Authentication Middleware** (`/lib/auth/middleware.ts`): Role-based access
- **Database Schema** (`/lib/db/schema.ts`): 13+ interconnected tables

## Data Flow Pattern
1. User enters QC data → `run_groups` created
2. Individual `qc_runs` created with raw values
3. **Westgard engine** evaluates against historical data
4. Z-scores calculated, violations detected
5. Status determined (accepted/rejected/pending)
6. Audit trail automatically logged