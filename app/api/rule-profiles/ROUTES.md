# Rule Profiles API Routes

This document describes the API endpoints for managing Westgard rule profiles in the C-Lab IQC Pro application.

## Authentication & Authorization

All endpoints require authentication via NextAuth session. Role-based access control is enforced:

- **Read Operations**: supervisor, qaqc, admin roles
- **Write Operations**: qaqc, admin roles only  
- **Binding Operations**: qaqc, admin roles only

All operations are automatically audited using the `withAuditAuth` middleware.

## Endpoints

### GET /api/rule-profiles

List all rule profiles with optional filtering.

**Query Parameters:**
- `active` (boolean): Filter by active/inactive profiles
- `scope` (string): Filter by scope type (global, test, device, device_test)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Default Global (MVP)",
    "enabledRules": { ... },
    "createdBy": "uuid",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
]
```

### POST /api/rule-profiles

Create a new rule profile.

**Request Body:**
```json
{
  "name": "Custom Profile Name",
  "enabledRules": {
    "window_size_default": 12,
    "rules": {
      "1-3s": {"enabled": true, "severity": "fail"},
      "1-2s": {"enabled": true, "severity": "warn"},
      ...
    }
  }
}
```

**Response:** Created profile object

### PUT /api/rule-profiles/[id]

Update an existing rule profile by ID.

**Request Body:** Same as POST
**Response:** Updated profile object

### GET /api/rule-profiles/resolve

Resolve the effective rule profile for a specific device/test combination.

**Query Parameters:**
- `deviceId` (required): Device UUID
- `testId` (required): Test UUID  
- `at` (optional): ISO date for time-based resolution (defaults to now)

**Response:**
```json
{
  "window_size_default": 12,
  "rules": {
    "1-3s": {"enabled": true, "severity": "fail"},
    ...
  }
}
```

### POST /api/rule-profiles/[id]/bindings  

Create a new binding for a rule profile to specify its scope.

**Request Body:**
```json
{
  "scopeType": "device_test|test|device|global",
  "testId": "uuid (optional, required for test/device_test scopes)",
  "deviceId": "uuid (optional, required for device/device_test scopes)", 
  "activeFrom": "ISO date (optional)",
  "activeTo": "ISO date (optional)"
}
```

**Response:** Created binding object

## Error Handling

Standard HTTP status codes are used:
- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found  
- `409 Conflict`: Duplicate name or conflicting binding
- `500 Internal Server Error`: Server-side errors

All errors return JSON with an `error` field containing a descriptive message.

## Rate Limiting

No specific rate limiting is implemented at the API level. NextAuth session management provides basic abuse protection.

## Audit Logging

All operations are logged to the audit table with:
- User ID and role
- Action performed
- Entity affected  
- Request metadata
- Timestamp
- IP address and user agent

## Example Usage

```bash
# List all profiles
curl -H "Cookie: session-token" /api/rule-profiles

# Get effective rules for a device/test
curl "/api/rule-profiles/resolve?deviceId=uuid&testId=uuid"

# Create a new profile  
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Custom Profile","enabledRules":{...}}' \
  /api/rule-profiles

# Bind profile to specific device
curl -X POST -H "Content-Type: application/json" \
  -d '{"scopeType":"device","deviceId":"uuid"}' \
  /api/rule-profiles/uuid/bindings
```
