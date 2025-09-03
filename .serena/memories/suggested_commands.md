# Suggested Commands for Development

## Development Server
```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build
npm run start        # Production server
```

## Database Operations (Critical for this project)
```bash
npm run db:generate  # Generate Drizzle migration files from schema
npm run db:push      # Apply schema changes directly to database
npm run db:migrate   # Run migration files (alternative to push)
npm run db:seed      # Seed database with sample data and demo users
```

## Code Quality
```bash
npm run lint         # ESLint checking with Next.js config
npm run build        # Also serves as a comprehensive type check
```

## Environment Setup
```bash
cp .env.example .env # Copy environment template
# Edit .env with:
# - DATABASE_URL (PostgreSQL connection string)
# - NEXTAUTH_SECRET (for JWT signing)
# - NEXTAUTH_URL (app URL for NextAuth)
```

## Windows System Commands
```powershell
dir                  # List directory contents (equivalent to ls)
Get-ChildItem        # PowerShell equivalent to ls -la
Select-String        # PowerShell equivalent to grep
findstr             # Windows equivalent to grep
```

## Demo Users (after db:seed)
- **admin** / password123 - System Administrator
- **qaqc1** / password123 - QA/QC Specialist
- **supervisor1** / password123 - Lab Supervisor  
- **tech1** / password123 - Lab Technician

## Important Notes
- Always run database commands when schema changes
- Use npm (not yarn/pnpm) as specified in package-lock.json
- Database seeding creates essential demo data for testing