# Code Style and Conventions

## TypeScript Configuration
- **Strict mode enabled** with comprehensive type checking
- **Path aliases**: `@/*` maps to project root
- **Target**: ES5 with DOM libraries
- **Module resolution**: bundler (Next.js)
- All files must have proper TypeScript types

## Database Schema Conventions
- **Drizzle ORM** with PostgreSQL
- **UUID primary keys** with `defaultRandom()`
- **Snake_case** for database columns (user_id, created_at)
- **CamelCase** for TypeScript properties
- **Relations defined** for better type inference
- **Indexes** on frequently queried columns

## React Component Patterns
- **App Router** structure in `/app` directory
- **Server Components** by default
- **Client Components** marked with 'use client'
- **Shadcn/ui style** for base components in `/components/ui/`
- **Feature components** in `/components/` root

## API Route Patterns
```typescript
// All API routes use withAuth middleware
export const POST = withAuth(
  async (request: NextRequest, user) => {
    // Route logic with authenticated user context
  },
  { permission: 'resource:action' }
)
```

## Styling Conventions
- **TailwindCSS** with custom config
- **Consistent rounded-2xl** for buttons and cards
- **Inter font** as default
- **cn() utility** for conditional classes: `cn(baseClasses, conditionalClasses)`
- **Color-coded status**: green (accepted), yellow (pending), red (rejected)

## File Naming
- **kebab-case** for directories and config files
- **PascalCase** for React components
- **camelCase** for utilities and hooks
- **snake_case** for database-related files when needed

## Import Conventions
```typescript
// Path alias usage
import { db } from '@/lib/db/client'
import { Button } from '@/components/ui/button'
```