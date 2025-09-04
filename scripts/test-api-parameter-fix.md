# API Parameter Fix Verification

This document describes the fix for the route parameter extraction issue in the rule profiles API.

## Problem

The API routes were failing with:
```
TypeError: Cannot read properties of undefined (reading 'params')
```

This happened because `withAuditAuth` middleware doesn't provide a `context` parameter with route params.

## Solution

Changed parameter extraction from:
```typescript
// Before (broken):
async (request: NextRequest, user, context) => {
  const id = context.params?.id as string

// After (fixed):
async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const id = pathSegments[pathSegments.length - 1] // For /api/rule-profiles/[id]
  // OR
  const profileId = pathSegments[pathSegments.length - 2] // For /api/rule-profiles/[id]/bindings
```

## Files Fixed

1. `/app/api/rule-profiles/[id]/route.ts`
   - Fixed both GET and PUT handlers
   - Extract ID from URL path segments

2. `/app/api/rule-profiles/[id]/bindings/route.ts`
   - Fixed both GET and POST handlers
   - Extract profile ID from path (second to last segment)

## URL Path Examples

For `/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619`:
- Split: ['', 'api', 'rule-profiles', 'e2721685-79db-4f92-887f-8517efa1a619']
- Last segment (index -1): 'e2721685-79db-4f92-887f-8517efa1a619'

For `/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619/bindings`:
- Split: ['', 'api', 'rule-profiles', 'e2721685-79db-4f92-887f-8517efa1a619', 'bindings']
- Second to last (index -2): 'e2721685-79db-4f92-887f-8517efa1a619'

## Test Commands

After starting the development server, these requests should now work:

```bash
# Get specific rule profile
curl "http://localhost:3000/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619" \
  -H "Cookie: your-session-cookie"

# List bindings for profile  
curl "http://localhost:3000/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619/bindings" \
  -H "Cookie: your-session-cookie"

# Create new binding
curl -X POST "http://localhost:3000/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619/bindings" \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"scopeType": "global"}'
```

## Expected Results

- No more "Cannot read properties of undefined" errors
- API endpoints return proper responses
- UI pages should load data correctly
- CRUD operations should work as expected
