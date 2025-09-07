# IQC Pro System - Current Architecture Overview

## Technology Stack
- **Frontend**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: TanStack Query v5 for server state
- **Authentication**: NextAuth with JWT, role-based access control
- **Database**: PostgreSQL with Drizzle ORM (no RLS)
- **Charts**: Recharts for L-J visualization
- **Testing**: Jest + React Testing Library

## Core Modules
- **Quick Entry**: QC data input with real-time Westgard validation
- **L-J Charts**: Interactive Levey-Jennings visualization with color-coded status
- **Approval Inbox**: Bulk approve/reject workflow with per-page selection
- **Settings/Catalog**: Device, test, QC level management
- **Westgard Engine**: Rule evaluation with configurable profiles
- **Audit System**: Comprehensive change tracking

## User Roles & Permissions
- **tech**: Basic QC entry, view own data
- **supervisor**: Approve QC, view team data  
- **qaqc**: Full QC management, rule configuration
- **admin**: System administration, user management

## Database Schema Highlights
- **qcRuns**: Core QC data with approval workflow
- **violations**: Westgard rule violation tracking
- **auditLog**: Change tracking with before/after diffs
- **ruleProfiles**: Configurable Westgard rule sets
- **devices/tests/methods**: Catalog management

## Recent Major Features
1. **Bulk Operations**: Approval inbox with checkbox selection, floating toolbar
2. **L-J Color Sync**: Fixed status color synchronization
3. **Westgard Integration**: Real-time rule evaluation with CAPA workflow

## Build Status: ✅ Production Ready
All features tested, TypeScript compliant, no build errors.