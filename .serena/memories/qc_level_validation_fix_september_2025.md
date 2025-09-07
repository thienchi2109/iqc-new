# QC Level Validation Fix - September 2025

## Problem Solved
Fixed QC level creation failure due to frontend sending `material: null` while backend Zod schema expected `string | undefined`. Also improved mutation error reporting to surface server validation details.

## Root Cause Analysis
- Frontend form was sending `material: null` for empty material field
- Backend Zod schema: `material: z.string().max(200).optional()` accepts string or undefined, but rejects null
- Client mutation error handling only used `error.message`, hiding structured server error details

## Changes Made

### 1. Frontend Payload Fix
**File**: `app/(app)/settings/catalog/qc-levels/page.tsx`
**Function**: `handleSubmit`
**Change**: Material field now sends `undefined` when empty:
```typescript
material: formData.material === undefined || formData.material === null || formData.material === ''
  ? undefined
  : formData.material,
```

### 2. Enhanced Error Handling
**File**: `hooks/catalog/useQcLevels.ts`
**Functions**: `useCreateQcLevel`, `useUpdateQcLevel`, `useDeleteQcLevel`
**Change**: Parse JSON error body and attach to thrown Error:
```typescript
if (!response.ok) {
  let errorBody: any = null
  try {
    errorBody = await response.json()
  } catch (e) {}

  const message = errorBody?.message || 'Failed to create QC level'
  const err = new Error(message)
  ;(err as any).body = errorBody
  throw err
}
```

## Validation Confirmed
- Backend Zod schema rejects `material: null` with "Expected string, received null"
- Backend accepts `material` omitted (undefined) or empty string
- Verified with TypeScript validation script: `npx tsx scripts/validate-qc-level.ts`

## Files Modified
1. `app/(app)/settings/catalog/qc-levels/page.tsx` - Frontend payload fix
2. `hooks/catalog/useQcLevels.ts` - Enhanced error handling
3. `scripts/validate-qc-level.ts` - Ad-hoc validation helper (created)

## Testing Status
- Local dev server started successfully (`npm run dev`)
- Zod schema behavior confirmed via direct TypeScript testing
- Changes align frontend with backend expectations

## Key Principle
Standardize on sending `undefined` (not `null`) for optional string fields to match Zod schema patterns across the application.