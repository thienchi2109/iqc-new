# Bulk Operations Implementation

## Overview
This document describes the implementation of bulk approve/reject functionality in the Approval Inbox page.

## Components

### 1. BulkToolbar Component
**File**: `components/BulkToolbar.tsx`

**Purpose**: Floating toolbar that appears when items are selected for bulk operations.

**Features**:
- Shows selected count
- Approve/Reject buttons with loading states
- Fixed position at bottom center
- Auto-hide when no items selected

**Props**:
```typescript
interface BulkToolbarProps {
  selectedCount: number
  onBulkApprove: () => void
  onBulkReject: () => void
  isLoading?: boolean
}
```

### 2. BulkRejectModal Component
**File**: `components/BulkRejectModal.tsx`

**Purpose**: Modal dialog for bulk rejection with required note input.

**Features**:
- Required note validation
- Warning message about bulk operation
- Loading states
- Clear note on close/cancel

**Props**:
```typescript
interface BulkRejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  selectedCount: number
  isLoading?: boolean
}
```

## API Integration

### Endpoints Used
- `POST /api/qc/runs/bulk-approve` - Bulk approve runs
- `POST /api/qc/runs/bulk-reject` - Bulk reject runs with notes

### Response Format
Both endpoints return:
```typescript
{
  successCount: number
  failureCount: number
  errors?: Array<{
    runId: string
    error: string
  }>
}
```

## UX Features

### Selection Management
- ✅ Per-page selection (resets on page/filter change)
- ✅ Select all checkbox with indeterminate state
- ✅ Individual row checkboxes for pending runs only
- ✅ Clear selection after successful operations

### User Feedback
- ✅ Toast notifications with success/failure counts
- ✅ Loading states on buttons and modals
- ✅ Validation messages for empty selections
- ✅ Warning messages for bulk operations

### Error Handling
- ✅ Best-effort processing (some succeed, some fail)
- ✅ Detailed error messages
- ✅ Graceful degradation
- ✅ Console logging for debugging

## Business Rules

### Bulk Approve
- Only pending runs can be approved
- Failed runs require CAPA completion
- Individual transaction rollback on errors
- Audit logging for each operation

### Bulk Reject
- Only pending runs can be rejected
- Rejection note is mandatory
- Same note applied to all selected runs
- Individual transaction rollback on errors
- Audit logging for each operation

## Usage Flow

1. **Selection**: User selects runs via checkboxes
2. **Action**: Click approve/reject in floating toolbar
3. **Confirmation**: For reject, modal opens for note input
4. **Processing**: API calls with loading states
5. **Feedback**: Success/error toasts with counts
6. **Refresh**: Data invalidation and selection reset

## Performance Considerations

- Selection state scoped to current page only
- Debounced filter changes to avoid excessive queries
- Query invalidation after bulk operations
- Optimistic UI updates where appropriate
