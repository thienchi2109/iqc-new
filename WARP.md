# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is **C-Lab IQC Pro**, a production-ready web application for Clinical Laboratory Internal Quality Control (IQC) management. It implements automated Westgard rules evaluation with Levey-Jennings charts for laboratory quality control compliance (ISO 15189).

## Core Technology Stack

- **Next.js 14+** with App Router and TypeScript
- **PostgreSQL** database with Drizzle ORM
- **NextAuth** for authentication with role-based access control
- **TailwindCSS** for styling
- **TanStack Query v5** for server state management
- **Recharts** for Levey-Jennings chart visualization

## Development Commands

### Common Development Tasks
```bash
# Development server
npm run dev

# Database operations
npm run db:generate     # Generate Drizzle migrations
npm run db:push        # Apply schema changes to database
npm run db:migrate     # Run migrations (alternative to push)
npm run db:seed        # Seed database with sample data

# Code quality & build
npm run lint           # ESLint checking
npm run build          # Production build
npm run start          # Production server
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret key
- `NEXTAUTH_URL` - Application URL for NextAuth

## Architecture Overview

### Application Structure
```
/app
├── (app)/              # Protected routes (requires authentication)
│   ├── dashboard/      # Main dashboard with QC status overview
│   ├── quick-entry/    # QC data entry forms
│   ├── lj-chart/       # Levey-Jennings chart visualization
│   └── reports/        # QC reports and analytics
├── api/                # API routes
│   ├── auth/           # NextAuth configuration
│   ├── devices/        # Laboratory instruments management
│   ├── tests/          # Test/analyte definitions
│   ├── qc/             # QC operations (runs, limits, evaluation)
│   ├── units/          # Units of measurement
│   └── methods/        # Analytical methods
└── auth/               # Authentication pages (signin, error)

/lib
├── db/                 # Database client and schema (Drizzle)
├── auth/               # Authentication configuration
└── qc/                 # QC business logic (Westgard rules engine)

/components
├── ui/                 # Base UI components (shadcn/ui style)
└── [feature-components] # Feature-specific React components
```

### Database Architecture
The schema centers around **QC Runs** with these key relationships:

**Master Data:**
- `users` - Authentication and role-based access (tech, supervisor, qaqc, admin)
- `devices` - Laboratory instruments/analyzers
- `tests` - Laboratory test/analyte definitions
- `units` & `methods` - Measurement units and analytical methods

**QC Configuration:**
- `qc_levels` - Control levels (L1, L2, L3) per test
- `qc_lots` - QC material lots with expiration tracking
- `qc_limits` - Statistical limits (Mean, SD, CV) per test×level×lot×device combination

**QC Operations:**
- `run_groups` - Multi-level QC entries performed simultaneously
- `qc_runs` - Individual QC measurements with Z-scores and status
- `violations` - Westgard rule violations with details
- `capa` - Corrective and Preventive Actions for rejected runs
- `audit_log` - Complete audit trail for compliance

### Westgard Rules Engine

The core business logic implements comprehensive Westgard quality control rules:

**Within-Level Rules:**
- **1-3s**: Single point beyond ±3SD (fail)
- **1-2s**: Single point beyond ±2SD (warning)
- **2-2s**: Two consecutive points beyond same ±2SD (fail)
- **4-1s**: Four consecutive points beyond same ±1SD (fail)
- **10x**: Ten consecutive points on same side of mean (fail)
- **7T**: Seven consecutive points with trend (fail)

**Across-Level Rules** (within run group):
- **R-4s**: Range between levels exceeds 4SD (fail)
- **2of3-2s**: Two of three levels beyond ±2SD (fail)

Key engine file: `/lib/qc/westgardEngine.ts`

### Authentication & Authorization

**Role-Based Access Control:**
- **tech**: QC data entry, view own data and charts
- **supervisor**: Approve/reject runs, CAPA management, view all data
- **qaqc**: Configure rules, generate reports, system-wide analysis
- **admin**: Master data management, user administration

**Session Management:**
- JWT-based sessions with 8-hour expiration
- NextAuth with credentials provider
- bcrypt password hashing
- Role-based API endpoint protection via middleware

## Key Implementation Details

### API Route Patterns
All API routes use `withAuth()` middleware for authentication and role-based permissions:
```typescript
export const POST = withAuth(
  async (request: NextRequest, user) => {
    // Route logic with authenticated user context
  },
  { permission: 'resource:action' }
)
```

### QC Data Entry Flow
1. Create `run_group` for multi-level entries at same timestamp
2. For each QC level, create `qc_run` with raw value
3. System fetches historical data and peer runs (same group)
4. **Westgard engine evaluates** against all rules
5. Calculates Z-score, determines status (accepted/rejected/pending)
6. Creates `violations` records for rule failures
7. Returns evaluation results for immediate feedback

### Database Operations
- Uses **Drizzle ORM** with full TypeScript support
- All QC operations wrapped in database transactions
- Indexed queries optimized for common filtering patterns
- Connection pooling configured for production deployment

## Testing Strategy

### Manual QA Checklist
Reference: `/src/tests/manual-qa-checklist.md`

### Sample Data
After running `npm run db:seed`, test with demo accounts:
- **admin** / password123 - System Administrator
- **qaqc1** / password123 - QA/QC Specialist  
- **supervisor1** / password123 - Lab Supervisor
- **tech1** / password123 - Lab Technician

## Production Deployment

**Vercel + Supabase Architecture:**
- Deploy to Vercel with automatic GitHub integration
- Use Supabase PostgreSQL or any PostgreSQL provider
- Configure connection pooling for production scale
- Set environment variables for production secrets

**Environment Variables:**
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=production-secret-key  
NEXTAUTH_URL=https://your-domain.vercel.app
```

## Development Guidelines

### Code Patterns
- **Server Actions**: Use for form submissions and data mutations
- **TanStack Query**: For client-side data fetching and caching  
- **Zod Validation**: All API inputs validated with schemas in `/lib/qc/validation.ts`
- **TypeScript**: Strict typing with database-generated types from Drizzle

### UI Components
- Based on shadcn/ui patterns with TailwindCSS
- Consistent rounded-2xl button styling throughout app
- Role-based navigation in `HeaderNav` component
- Chart components use Recharts for Levey-Jennings plots

### Database Schema Changes
1. Modify `/lib/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Apply with `npm run db:push`
4. Update seed script if needed: `/scripts/seed.ts`

## Key Files to Understand

- `/lib/qc/westgardEngine.ts` - Core QC rules evaluation logic
- `/lib/db/schema.ts` - Complete database schema with relationships
- `/app/api/qc/runs/route.ts` - Main QC data entry API endpoint
- `/app/(app)/layout.tsx` - Protected routes authentication wrapper
- `/components/HeaderNav.tsx` - Role-based navigation component

