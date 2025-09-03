# Task Completion Workflow

## Before Committing Code

1. **Type Checking**
   ```bash
   # Full type check via build
   npm run build
   ```

2. **Linting**
   ```bash
   # Run ESLint
   npm run lint
   ```

3. **Testing**
   - Manual testing via specific user roles
   - Test critical Westgard rule evaluation 
   - Test with demo data after seeding

4. **Database Schema Changes**
   ```bash
   # If you modified /lib/db/schema.ts
   npm run db:generate  # Generate migration files
   npm run db:push      # Apply to development database
   ```

5. **Documentation**
   - Update any relevant comments/docs
   - Add JSDoc comments for complex functions
   - Document Westgard rule changes extensively

## After Task Completion

Verify against role-based access:
- Test with appropriate user roles (admin, qaqc, supervisor, tech)
- Ensure proper permissions for different operations
- Check proper display of status indicators (green/yellow/red)

## Code Quality Checklist

- Proper TypeScript types used throughout
- Component naming consistent with existing patterns
- Database transactions for multi-step operations
- Westgard rule implementation matches specifications
- UI components use consistent styling (TailwindCSS classes)
- No hardcoded credentials or sensitive data