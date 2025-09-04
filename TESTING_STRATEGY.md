# Testing Setup for Westgard Rule Profiles

## Testing Strategy

### Phase 6: Unit Tests for Rule Profile System

1. **Profile Resolution Logic Tests** (`lib/qc/resolveProfile.test.ts`)
   - Test scope priority resolution (device_test > test > device > global)
   - Test date filtering (active date ranges)  
   - Test default fallback behavior
   - Test error handling for invalid data

2. **Westgard Engine Integration Tests** (`lib/qc/westgardEngine.test.ts`)
   - Test rule evaluation with different profiles
   - Test fallback to legacy behavior when feature flag is off
   - Test handling of missing rules in profiles

3. **API Route Tests** (`app/api/rule-profiles/tests/`)
   - Test CRUD operations with proper authentication
   - Test validation and error responses
   - Test audit logging functionality
   - Test permission-based access control

4. **Database Schema Tests** (`lib/db/schema.test.ts`)
   - Test profile and binding creation
   - Test foreign key constraints
   - Test data validation

## Test Implementation Plan

### Prerequisites
- Install Jest and testing utilities
- Setup test database configuration
- Create test data fixtures
- Setup mocking utilities for NextAuth and database

### Test Categories

1. **Unit Tests**: Individual function/module testing
2. **Integration Tests**: API endpoints with database
3. **End-to-End Tests**: Full workflow testing

### Coverage Goals
- Profile resolution logic: 95%+
- API routes: 90%+
- Westgard engine integration: 90%+
- Database operations: 85%+

## Test Data Strategy

### Test Profiles
- Global default profile (comprehensive rules)
- Device-specific profile (subset of rules)
- Test-specific profile (custom thresholds)
- Date-bounded profiles (active/inactive)

### Test Bindings
- Global scope bindings
- Device scope bindings  
- Test scope bindings
- Device-test scope bindings

### Test QC Data
- Normal results (within limits)
- Results triggering single rules
- Results triggering multiple rules
- Edge cases and boundary conditions
