# Development Best Practices & Patterns

## Code Organization
- **Component Structure**: Feature-based organization under `components/`
- **API Routes**: RESTful endpoints under `app/api/` with Zod validation
- **Type Safety**: Strict TypeScript with Drizzle schema types
- **Error Handling**: Comprehensive error boundaries, validation, toast notifications

## UI/UX Patterns
- **Vietnamese Localization**: All user-facing text in Vietnamese
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Loading States**: Skeleton loaders, spinner indicators
- **Accessibility**: aria-labels, keyboard navigation, screen reader support

## Data Patterns
- **TanStack Query**: Server state with caching, invalidation, optimistic updates
- **Form Validation**: Zod schemas for both client and server
- **Pagination**: Offset-based with configurable page sizes
- **Real-time Updates**: Auto-refresh with placeholderData for smooth UX

## Development Workflow
- **Build Process**: Next.js with Babel config, ESLint compliance
- **Environment**: Local development with .env.local
- **Database**: Drizzle migrations, SQL schema management
- **Testing**: Component testing with proper mocking

## Performance Optimizations
- **Code Splitting**: Dynamic imports, component lazy loading
- **Query Optimization**: Efficient database queries with Drizzle
- **Bundle Size**: Tree shaking, proper dependency management
- **Memory Management**: Proper cleanup in useEffect hooks

## Security Considerations
- **Authentication**: JWT tokens, secure session management
- **Authorization**: Role-based access control throughout application
- **Input Validation**: Server-side validation with Zod schemas
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM