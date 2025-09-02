# C-Lab IQC Pro

A production-ready web application for Clinical Laboratory Internal Quality Control (IQC) management using Levey-Jennings charts and Westgard rules evaluation.

## Features

- **Multi-device, Multi-test QC Management**: Support for multiple laboratory instruments and test parameters
- **Automated Westgard Rules Evaluation**: Real-time evaluation of 1-3s, 1-2s, 2-2s, R-4s, 4-1s, 10x, 7T rules
- **Interactive Levey-Jennings Charts**: Dynamic L-J charts with violation visualization using Recharts
- **Quick Entry Interface**: Fast data entry for up to 3 QC levels in one session
- **Role-based Access Control**: Tech, Supervisor, QA/QC, and Admin roles with appropriate permissions
- **Real-time Status Monitoring**: Color-coded status (green/yellow/red) based on Westgard rule violations
- **Comprehensive Reporting**: Summary reports with violation statistics and Excel export
- **CAPA Management**: Corrective and Preventive Action tracking for rejected runs
- **Audit Trail**: Complete audit logging for ISO 15189 compliance

## Technology Stack

### Frontend
- **Next.js 14+** with App Router and TypeScript
- **TailwindCSS** for styling with Inter font
- **TanStack Query v5** for server state management
- **Recharts** for Levey-Jennings chart visualization
- **NextAuth** with Credentials provider for authentication

### Backend
- **Next.js API Routes** with Node.js runtime
- **Supabase Postgres** database (no RLS, API-level authorization)
- **Drizzle ORM** with drizzle-kit for migrations
- **bcrypt** for password hashing

### Additional Libraries
- **Zod** for validation
- **SheetJS (xlsx)** for Excel import/export (planned)

## Project Structure

```
c-lab-iqc-pro/
├── app/
│   ├── (app)/                 # Protected app routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── quick-entry/       # QC data entry form
│   │   ├── lj-chart/         # Levey-Jennings charts
│   │   └── reports/          # Reports and analytics
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── devices/          # Device management
│   │   ├── tests/            # Test/analyte management
│   │   ├── units/            # Units of measurement
│   │   ├── methods/          # Analytical methods
│   │   └── qc/               # QC operations
│   └── auth/                 # Authentication pages
├── components/               # React components
│   ├── ui/                   # Base UI components
│   ├── HeaderNav.tsx         # Navigation component
│   └── StatusCard.tsx        # Dashboard status cards
├── lib/
│   ├── db/                   # Database configuration
│   ├── auth/                 # Authentication configuration
│   └── qc/                   # QC business logic
├── scripts/
│   └── seed.ts              # Database seeding script
└── types/                   # TypeScript type definitions
```

## Database Schema

The application uses a comprehensive schema designed for laboratory QC management:

### Core Tables
- **users**: Authentication and role management
- **devices**: Laboratory instruments/analyzers
- **tests**: Test/analyte definitions
- **units** & **methods**: Measurement units and analytical methods
- **qc_levels**: QC control levels (L1, L2, L3)
- **qc_lots**: QC material lots with expiration tracking
- **qc_limits**: Statistical limits (Mean, SD, CV) per test×level×lot×device
- **run_groups**: Multi-level QC entries at same time
- **qc_runs**: Individual QC measurements with Z-scores and status
- **violations**: Westgard rule violations with details
- **capa**: Corrective and Preventive Actions
- **audit_log**: Complete audit trail

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (local or Supabase)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd c-lab-iqc-pro
npm install
```

2. **Environment Configuration**:
```bash
cp .env.example .env
```

Edit `.env` with your database connection:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/c_lab_iqc_pro
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

3. **Database Setup**:
```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:push

# Seed with sample data
npm run db:seed
```

4. **Start Development Server**:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Demo Accounts

After running the seed script, you can login with these accounts (password: `password123`):

- **admin** - System Administrator (full access)
- **qaqc1** - QA/QC Specialist (reports, rule configuration)
- **supervisor1** - Lab Supervisor (run approval, CAPA management)
- **tech1** - Lab Technician (data entry, chart viewing)

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth authentication

### Master Data
- `GET/POST /api/devices` - Device management
- `GET/POST /api/tests` - Test/analyte management
- `GET/POST /api/units` - Units of measurement
- `GET/POST /api/methods` - Analytical methods

### QC Operations
- `POST /api/qc/limits` - QC limits configuration
- `POST /api/qc/run-groups` - Create run group
- `POST /api/qc/runs` - Main QC data entry with Westgard evaluation
- `GET /api/qc/runs` - Retrieve QC data with filtering
- `GET /api/qc/levels` - QC levels by test
- `GET /api/qc/lots` - QC lots by level

## Westgard Rules Implementation

The application implements a comprehensive Westgard rules engine with the following rules:

### Within-Level Rules
- **1-3s**: Single point beyond ±3SD (fail)
- **1-2s**: Single point beyond ±2SD (warning)
- **2-2s**: Two consecutive points beyond same ±2SD (fail)
- **4-1s**: Four consecutive points beyond same ±1SD (fail)
- **10x**: Ten consecutive points on same side of mean (fail)
- **7T**: Seven consecutive points with trend (fail)

### Across-Level Rules (within run group)
- **R-4s**: Range between levels exceeds 4SD (fail)
- **2of3-2s**: Two of three levels beyond ±2SD (fail)

## Usage Workflow

1. **Setup Master Data**: Configure devices, tests, units, methods (Admin)
2. **Configure QC Levels & Lots**: Set up QC materials with expiration dates
3. **Set QC Limits**: Define Mean/SD/CV for each test×level×lot×device combination
4. **Daily QC Entry**: Use Quick Entry to input QC values for multiple levels
5. **Monitor Results**: View L-J charts with real-time rule evaluation
6. **Manage Violations**: Create CAPA for rejected runs, approve/reject as needed
7. **Generate Reports**: Review performance statistics and export data

## Development

### Key Dependencies
```bash
npm install next@latest react@latest react-dom@latest typescript
npm install @tanstack/react-query next-auth bcrypt
npm install drizzle-orm drizzle-kit pg
npm install recharts zod tailwindcss clsx tailwind-merge
```

### Database Operations
```bash
npm run db:generate    # Generate migration files
npm run db:push        # Apply schema to database
npm run db:seed        # Seed with sample data
```

### Code Quality
```bash
npm run lint          # ESLint checking
npm run build         # Production build test
```

## Deployment

The application is designed for deployment on Vercel with Supabase Postgres:

1. **Vercel Setup**:
   - Connect GitHub repository
   - Set environment variables
   - Deploy automatically on push

2. **Database**:
   - Use Supabase Postgres or any PostgreSQL provider
   - Run migrations after deployment
   - Configure connection pooling

3. **Environment Variables**:
   ```env
   DATABASE_URL=your-supabase-connection-string
   NEXTAUTH_SECRET=production-secret-key
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is proprietary software for clinical laboratory use. Please contact the authors for licensing information.

## Support

For technical support or feature requests, please create an issue in the repository or contact the development team.

---

**Note**: This is a production-ready skeleton implementation. Additional features like direct instrument connectivity, advanced reporting, and mobile optimization can be added in future phases.