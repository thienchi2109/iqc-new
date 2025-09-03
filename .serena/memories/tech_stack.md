# Tech Stack and Dependencies

## Core Framework
- **Next.js 14+** with App Router and TypeScript
- **React 18+** for UI components
- **TypeScript** for type safety with strict mode enabled

## Database and ORM
- **PostgreSQL** database (Supabase or self-hosted)
- **Drizzle ORM** with drizzle-kit for schema management
- **Connection Pooling** configured for production

## Authentication & Authorization
- **NextAuth v4** with Credentials provider
- **bcrypt** for password hashing
- **JWT-based sessions** with 8-hour expiration
- **Role-based access control** middleware

## Styling and UI
- **TailwindCSS** for styling with custom config
- **Inter font** as default sans-serif
- **shadcn/ui-style components** in `/components/ui/`
- **clsx + tailwind-merge** for conditional classes

## Data Management
- **TanStack Query v5** for server state management
- **Zod** for validation schemas
- **Recharts** for Levey-Jennings chart visualization

## Development Tools
- **ESLint** with Next.js core web vitals config
- **PostCSS + Autoprefixer** for CSS processing
- **tsx** for running TypeScript scripts
- **npm** as package manager (preferred over yarn/pnpm)

## Planned/Optional
- **SheetJS (xlsx)** for Excel import/export
- **Vercel** for deployment
- **Supabase** for database hosting