# Rule Profiles API Testing

This document provides test commands for the rule profiles API endpoints.

## Prerequisites

1. Start the development server: `npm run dev`
2. Authenticate in the browser to get session cookies
3. Extract session cookie for API calls

## Test Commands

### 1. List All Rule Profiles

```bash
curl -X GET "http://localhost:3000/api/rule-profiles" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
[
  {
    "id": "e2721685-79db-4f92-887f-8517efa1a619",
    "name": "Default Global (MVP)",
    "enabledRules": { ... },
    "createdBy": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 2. Get Specific Rule Profile

```bash
curl -X GET "http://localhost:3000/api/rule-profiles/e2721685-79db-4f92-887f-8517efa1a619" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json"
```

### 3. Resolve Effective Configuration

```bash
curl -X GET "http://localhost:3000/api/rule-profiles/resolve?deviceId=a1f5c894-ceac-43af-9d1c-2c293d772058&testId=3fe37b45-d9b5-4563-bd5e-73c05032b8f0" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "resolvedAt": "2025-09-04T01:30:00.000Z",
  "deviceId": "a1f5c894-ceac-43af-9d1c-2c293d772058",
  "testId": "3fe37b45-d9b5-4563-bd5e-73c05032b8f0",
  "evaluatedAt": "2025-09-04T01:30:00.000Z",
  "profileConfigEnabled": true,
  "config": {
    "window_size_default": 12,
    "rules": {
      "1-3s": {"enabled": true, "severity": "fail"},
      "1-2s": {"enabled": true, "severity": "warn"},
      ...
    }
  }
}
```

### 4. Create New Rule Profile

```bash
curl -X POST "http://localhost:3000/api/rule-profiles" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Strict Quality Control",
    "enabledRules": {
      "window_size_default": 10,
      "rules": {
        "1-3s": {"enabled": true, "severity": "fail"},
        "1-2s": {"enabled": true, "severity": "fail"},
        "2-2s": {"enabled": true, "severity": "fail"},
        "3-1s": {"enabled": true, "severity": "fail", "threshold_sd": 1, "window": 3},
        "4-1s": {"enabled": true, "severity": "fail", "threshold_sd": 1, "window": 4},
        "6x": {"enabled": true, "severity": "warn", "n": 6},
        "7T": {"enabled": true, "severity": "fail", "n": 7},
        "10x": {"enabled": true, "severity": "fail", "n": 10},
        "R-4s": {"enabled": true, "severity": "fail", "delta_sd": 3, "within_run_across_levels": true, "across_runs": true},
        "2of3-2s": {"enabled": true, "severity": "fail", "threshold_sd": 2, "window": 3}
      }
    }
  }'
```

### 5. Update Rule Profile

```bash
curl -X PUT "http://localhost:3000/api/rule-profiles/PROFILE_ID_HERE" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Strict Quality Control",
    "enabledRules": {
      "window_size_default": 15,
      "rules": {
        "1-3s": {"enabled": true, "severity": "fail"},
        "1-2s": {"enabled": true, "severity": "warn"}
      }
    }
  }'
```

### 6. Create Rule Profile Binding

```bash
curl -X POST "http://localhost:3000/api/rule-profiles/PROFILE_ID_HERE/bindings" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json" \
  -d '{
    "scopeType": "device",
    "deviceId": "a1f5c894-ceac-43af-9d1c-2c293d772058"
  }'
```

### 7. List Bindings for Profile

```bash
curl -X GET "http://localhost:3000/api/rule-profiles/PROFILE_ID_HERE/bindings" \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json"
```

## Testing Scenarios

### Test Priority Resolution

1. Create a global profile (already exists: "Default Global (MVP)")
2. Create a device-specific profile and bind it to a device
3. Create a test-specific profile and bind it to a test
4. Create a device+test specific profile and bind it to both
5. Call resolve endpoint and verify it returns the most specific profile

### Test Permission Handling

1. Try to access endpoints without authentication (should return 401)
2. Try to create/update with insufficient role (should return 403)
3. Verify that supervisor can read but cannot write
4. Verify that qaqc can read and write

### Test Validation

1. Try to create profile with invalid rule configuration
2. Try to create binding with invalid scope type
3. Try to create device_test binding without required testId/deviceId
4. Try to reference non-existent devices or tests

## Expected Database State After Tests

After running the tests, you should see:
- Multiple rule profiles in `rule_profiles` table
- Multiple bindings in `rule_profile_bindings` table
- Audit log entries in `audit_log` table for each operation

## Cleanup

To reset the database state:
```sql
DELETE FROM rule_profile_bindings WHERE profile_id != 'e2721685-79db-4f92-887f-8517efa1a619';
DELETE FROM rule_profiles WHERE name != 'Default Global (MVP)';
```
