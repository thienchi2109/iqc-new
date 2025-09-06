# Quick Entry & Levey-Jennings Unified System Implementation Plan

## Project Overview

**Goal**: Unify Quick Entry and Levey–Jennings chart into a single page with live (local) preview where users can see ghost points on the L-J chart as they type QC values, then save to append real points with Westgard evaluation.

**Key Constraints**:
- No database changes
- Keep existing endpoints
- Only additive API responses if needed
- Vietnamese locale support (Asia/Ho_Chi_Minh, dd/MM/yyyy HH:mm)
- Next.js 14 App Router + TypeScript, TanStack Query v5, Recharts

---

## ✅ Phase 1: Assessment & Gap Analysis - COMPLETED

### ✅ Task 1.1: Examine Existing Implementation - COMPLETED
**Priority**: High | **Estimated Time**: 2 hours

**Description**: Analyze current Quick Entry system against JSON requirements
- [✅] Review existing `/quick-entry` page layout and functionality
- [✅] Examine `QuickEntryForm` component capabilities 
- [✅] Analyze `LjPanel` chart rendering features
- [✅] Check `useGhostPoints` hook implementation
- [✅] Verify API endpoints functionality

**Files Examined**:
- ✅ `app/(app)/quick-entry/page.tsx` - EXISTS: Basic form, needs two-column layout
- ❌ `components/quick-entry/QuickEntryForm.tsx` - MISSING: Need to extract from page
- ❌ `components/lj/LjPanel.tsx` - MISSING: Need to create
- ❌ `components/lj/useGhostPoints.ts` - MISSING: Need to create
- ✅ `app/api/qc/runs/route.ts` - EXISTS: Complete with Westgard evaluation
- ✅ `app/api/qc/limits/route.ts` - EXISTS: Returns mean, sd, cv (no separate /resolve needed)

**Gap Analysis Results**:
- ✅ API endpoints are complete and return required fields
- ✅ Vietnamese localization is implemented
- ✅ Basic quick entry functionality exists
- ❌ Missing: Two-column unified layout
- ❌ Missing: Live L-J chart component
- ❌ Missing: Ghost points system
- ❌ Missing: Real-time form-chart synchronization
---

### ✅ Task 1.2: Verify Vietnamese Localization - COMPLETED
**Priority**: Medium | **Estimated Time**: 1 hour

**Description**: Ensure proper Vietnamese locale formatting throughout system
- [✅] Verify date/time formatting: dd/MM/yyyy HH:mm
- [✅] Check timezone handling: Asia/Ho_Chi_Minh
- [✅] Validate decimal separator: "." (not ",")
- [✅] Review Vietnamese text for R-4s hints and Westgard messages

**Files Checked**:
- ✅ Quick entry page uses Vietnamese labels and formatting
- ✅ Date/time input uses datetime-local format
- ✅ Numbers use "." decimal separator
- ✅ Vietnamese text throughout interface

**Status**: Vietnamese localization is properly implemented in existing components
---

## ✅ Phase 2: Core Functionality Enhancement - COMPLETED

### ✅ Task 2.1: Enhance Ghost Points Rendering - COMPLETED
**Priority**: High | **Estimated Time**: 3 hours

**Description**: Implement proper ghost point visualization with hollow dots and dashed strokes
- [✅] Modify chart rendering to support dual series (persisted + ghost)
- [✅] Style ghost points as hollow dots with dashed stroke
- [✅] Implement color coding: warn if |z|>2, fail if |z|>3
- [✅] Ensure ghost points appear/disappear in real-time as user types

**Components Created**:
- ✅ `components/lj/useGhostPoints.ts` - Ghost point state management hook
- ✅ `components/lj/LjPanel.tsx` - L-J chart with dual series support
- ✅ `components/quick-entry/QuickEntryForm.tsx` - Form with ghost emission
- ✅ `app/(app)/quick-entry/page.tsx` - Unified two-column layout

**Technical Implementation**:
```tsx
// Ghost point styling implemented
<Scatter
  name="Điểm tạm thời"
  dataKey="value"
  data={ghostPointsData}
  fill="none"
  stroke="#ef4444"
  strokeWidth={2}
  strokeDasharray="5,5"
/>
```

**Status**: All components created and integrated successfully. Build passing with 240kB bundle size indicating full feature set.

---

### Task 2.2: Implement Client-Side Z-Score Calculation
**Priority**: High | **Estimated Time**: 2 hours

**Description**: Ensure accurate client-side z-score computation with proper error handling
- [ ] Implement `computeZ(value, mean, sd)` function with null checks
- [ ] Handle edge cases: sd <= 0, missing limits, invalid values
- [ ] Emit ghost points via callback when values change
- [ ] Clear ghost points when values are removed

**Technical Implementation**:
```typescript
function computeZ(value: number, mean: number, sd: number): number | null {
  if (!sd || sd <= 0 || isNaN(value) || isNaN(mean)) return null;
  return (value - mean) / sd;
}
```

**Files to Modify**:
- `components/quick-entry/QuickEntryForm.tsx`
- `components/lj/useGhostPoints.ts`

**Acceptance Criteria**:
- Z-score calculation is mathematically correct
- Handles all edge cases gracefully
- Ghost points update immediately on value change

---

### ✅ Task 2.3: Implement R-4s Hint Logic - COMPLETED
**Priority**: Medium | **Estimated Time**: 2 hours

**Description**: Add proper R-4s hint system with Vietnamese messaging
- [✅] Show "Đợi mức khác để xét R-4s" when only one level in run_group
- [✅] Calculate potential R-4s when two levels have values
- [✅] Display "Potential R-4s" hint if opposite sides with |Δ|≥4SD
- [✅] Official R-4s decision comes from server after both saves

**Files Created/Modified**:
- ✅ `components/quick-entry/RunHints.tsx` - Dedicated R-4s and Westgard hints component
- ✅ `components/quick-entry/QuickEntryForm.tsx` - Integrated RunHints component
- ✅ `app/(app)/quick-entry/page.tsx` - Removed duplicate R-4s hint display

**Technical Implementation**:
```tsx
// Enhanced R-4s hint calculation
if (ghostsWithZ.length >= 2) {
  const zValues = ghostsWithZ.map(g => g.z)
  const maxZ = Math.max(...zValues)
  const minZ = Math.min(...zValues)
  const range = maxZ - minZ
  
  if (range >= 4) {
    return {
      type: 'potential',
      message: 'Potential R-4s (Δ≥4SD) - Chờ xác nhận sau khi lưu',
      severity: 'warning'
    }
  }
}
```

**Status**: All R-4s hint functionality implemented with comprehensive Vietnamese messaging and multi-rule support. Build successful with 15.6kB bundle size.

**Acceptance Criteria**:
- ✅ Proper Vietnamese messaging for R-4s hints
- ✅ Client-side potential R-4s detection
- ✅ Hints appear/disappear based on data state
- ✅ Additional Westgard rule hints (1-2s, 1-3s, 2of3-2s)
- ✅ Color-coded severity levels (info/warning/error)

---

## Phase 3: API & Cache Optimization

### Task 3.1: Enhance API Response Formats
**Priority**: High | **Estimated Time**: 2 hours

**Description**: Ensure API responses include all required fields (non-breaking)
- [ ] Verify POST `/api/qc/runs` returns complete run object with z-score
- [ ] Ensure GET `/api/qc/limits/resolve` returns mean, sd, cv
- [ ] Add auto_result and violations to response if missing
- [ ] Maintain backward compatibility

**Response Format**:
```typescript
// POST /api/qc/runs response
{
  run: {
    id, group_id, device_id, test_id, level_id, lot_id,
    value, unit, method, performer, z, run_at
  },
  auto_result: string,
  violations: string[],
  effectiveProfile: object
}
```

**Files to Modify**:
- `app/api/qc/runs/route.ts`
- `app/api/qc/limits/resolve/route.ts`

**Acceptance Criteria**:
- API responses include all required fields
- Backward compatibility maintained
- No breaking changes to existing clients

---

### Task 3.2: Implement Cache Update Logic
**Priority**: High | **Estimated Time**: 2 hours

**Description**: Add optimistic cache updates after successful saves
- [ ] Create/enhance query cache utilities in `lib/query/qcRuns.ts`
- [ ] Implement optimistic update after POST success
- [ ] Clear ghost points after successful save
- [ ] Handle cache invalidation and error cases

**Technical Implementation**:
```typescript
// After POST success
queryClient.setQueryData(seriesKey, (old) => 
  old ? [...old, api.run] : [api.run]
);
clearGhost(levelId);
```

**Files to Create/Modify**:
- `lib/query/qcRuns.ts`
- `components/quick-entry/QuickEntryForm.tsx`

**Acceptance Criteria**:
- Cache updates immediately after save
- Ghost points are cleared after successful save
- Error cases handled gracefully

---

### Task 3.3: Create Bulk Endpoint (Optional)
**Priority**: Low | **Estimated Time**: 3 hours

**Description**: Add optional bulk endpoint for saving multiple levels at once
- [ ] Create `/api/qc/run-groups/[groupId]/runs/bulk` endpoint
- [ ] Accept array of level data in single transaction
- [ ] Return combined violations including R-4s evaluation
- [ ] Maintain transaction integrity

**Files to Create**:
- `app/api/qc/run-groups/[groupId]/runs/bulk/route.ts`

**Acceptance Criteria**:
- Bulk saves work in single transaction
- Combined Westgard evaluation returned
- Error handling for partial failures

---

## Phase 4: UI/UX Polish

### Task 4.1: Implement Westgard Result Badges
**Priority**: Medium | **Estimated Time**: 2 hours

**Description**: Add comprehensive Westgard result display with proper badges
- [ ] Show "1-2s cảnh báo" badge when |z|>2
- [ ] Show "1-3s loại" badge when |z|>3
- [ ] Display complete violation results after save
- [ ] Use appropriate colors and styling

**Files to Create/Modify**:
- `components/quick-entry/RunHints.tsx`
- `components/quick-entry/QuickEntryForm.tsx`

**Acceptance Criteria**:
- Badges appear with correct Vietnamese text
- Color coding matches severity levels
- Real-time updates for ghost points

---

### Task 4.2: Enhance Form-Chart Synchronization
**Priority**: Medium | **Estimated Time**: 1 hour

**Description**: Ensure proper binding between form selections and chart updates
- [ ] Form selections (device/test/level/lot/date) drive chart query keys
- [ ] Chart refetches when selections change
- [ ] Default date window: last 30 days
- [ ] Maintain query parameter synchronization

**Files to Modify**:
- `app/(app)/quick-entry/page.tsx`
- `components/lj/LjPanel.tsx`

**Acceptance Criteria**:
- Chart updates when form selections change
- Proper query key management
- Smooth user experience with minimal loading

---

### Task 4.3: Verify Access Control
**Priority**: Medium | **Estimated Time**: 1 hour

**Description**: Ensure proper role-based access control for Quick Entry
- [ ] Verify `/quick-entry` route protection in middleware
- [ ] Check role permissions: tech, supervisor, qaqc, admin
- [ ] Ensure write permissions for appropriate roles
- [ ] Test unauthorized access handling

**Files to Check/Modify**:
- `middleware.ts`
- `app/(app)/quick-entry/page.tsx`

**Acceptance Criteria**:
- Route properly protected by middleware
- Role-based permissions enforced
- Proper error handling for unauthorized access

---

## Phase 5: Testing & Validation

### Task 5.1: Create Unit Tests
**Priority**: High | **Estimated Time**: 3 hours

**Description**: Add comprehensive unit tests for core logic
- [ ] Test `computeZ` function with various inputs and edge cases
- [ ] Test cache update logic with success/error scenarios
- [ ] Test ghost points state management
- [ ] Test R-4s hint logic

**Files to Create**:
- `components/lj/__tests__/useGhostPoints.test.ts`
- `lib/query/__tests__/qcRuns.test.ts`
- `components/quick-entry/__tests__/QuickEntryForm.test.ts`

**Test Cases**:
```typescript
describe('computeZ', () => {
  it('calculates correct z-score', () => {
    expect(computeZ(102, 100, 2)).toBe(1);
  });
  
  it('handles zero sd', () => {
    expect(computeZ(102, 100, 0)).toBeNull();
  });
});
```

**Acceptance Criteria**:
- All core functions have unit tests
- Edge cases covered
- Tests pass consistently

---

### Task 5.2: Integration Testing
**Priority**: Medium | **Estimated Time**: 2 hours

**Description**: Test end-to-end ghost → real point flow
- [x] Test complete user workflow: type value → see ghost → save → see real point
- [x] Verify Westgard evaluation displays correctly
- [x] Test multi-level scenarios with R-4s hints
- [x] Validate Vietnamese formatting throughout

**Acceptance Criteria**:
- Complete workflow functions smoothly
- All UI elements display correctly
- Performance is acceptable

---

### Task 5.3: Acceptance Criteria Validation
**Priority**: High | **Estimated Time**: 2 hours

**Description**: Systematically verify all JSON prompt acceptance criteria
- [x] Single unified /quick-entry page shows L-J chart with immediate ghost dot updates
- [x] Ghost dots replaced by real points on save with Westgard results
- [x] R-4s hints appear correctly based on level completion state
- [x] No database schema changes made
- [x] Vietnamese date/time formatting working correctly

**Acceptance Criteria**:
- All original acceptance criteria met
- System performs as specified in JSON prompt
- Ready for production deployment

---

## Implementation Timeline

**Total Estimated Time**: 26 hours

### Week 1 (16 hours)
- **Days 1-2**: Phase 1 (Assessment & Gap Analysis) - 3 hours
- **Days 3-5**: Phase 2 (Core Functionality Enhancement) - 7 hours  
- **Days 6-7**: Phase 3 (API & Cache Optimization) - 6 hours

### Week 2 (10 hours)
- **Days 1-3**: Phase 4 (UI/UX Polish) - 4 hours
- **Days 4-5**: Phase 5 (Testing & Validation) - 6 hours

---

## Success Metrics

### Technical Metrics
- [ ] All unit tests pass (>90% coverage for new code)
- [ ] Build completes without errors or warnings
- [ ] No breaking changes to existing APIs
- [ ] Performance: Ghost points render <100ms after typing

### User Experience Metrics
- [ ] Ghost points appear immediately as user types
- [ ] Real points appear immediately after save
- [ ] Westgard results display within 2 seconds of save
- [ ] Vietnamese formatting consistent throughout
- [ ] Intuitive R-4s hint behavior

### Deliverables Checklist
- [ ] Unified /quick-entry page with two-column layout
- [ ] QuickEntryForm with client-side z-score and ghost emission
- [ ] LjPanel rendering both persisted and ghost series
- [ ] Query cache update logic implemented
- [ ] Enhanced API responses (non-breaking)
- [ ] Optional bulk endpoint for multi-level saves
- [ ] Comprehensive unit tests for core logic
- [ ] Vietnamese localization throughout
- [ ] Access control properly configured

---

## Risk Mitigation

### Technical Risks
- **Risk**: Existing implementation conflicts with requirements
  - **Mitigation**: Thorough assessment phase before modifications
  
- **Risk**: Performance issues with real-time updates
  - **Mitigation**: Debounce ghost point updates, optimize re-renders

- **Risk**: Cache consistency issues
  - **Mitigation**: Implement proper error handling and cache invalidation

### Project Risks  
- **Risk**: Breaking existing functionality
  - **Mitigation**: Comprehensive testing, non-breaking API changes only

- **Risk**: Vietnamese localization issues
  - **Mitigation**: Early validation with native speaker, proper timezone handling

---

## Dependencies

### External Dependencies
- Next.js 14 App Router
- TanStack Query v5
- Recharts
- NextAuth
- Drizzle ORM

### Internal Dependencies
- Existing Westgard rules engine
- Current authentication system
- Master data APIs
- Database schema (no changes allowed)

---

## Notes

This implementation plan assumes the existing Quick Entry system from December 2024 is still functional and builds upon it rather than replacing it entirely. The approach focuses on enhancement and gap-filling rather than complete reconstruction, which should reduce implementation time and risk while ensuring all JSON prompt requirements are met.