# Automatic Token Management for Scheduling Service

## Date
2024-12-28

## Context
The scheduling service previously required manual configuration of `SCHEDULE_AUTH_TOKEN` which was cumbersome and error-prone. Users had to manually generate JWT tokens and configure them in environment variables.

## Decision
Implement automatic token management in the `SchedulingService` to eliminate manual token configuration.

## Changes Made

### 1. Removed Manual Token Configuration
- **Removed**: `SCHEDULE_AUTH_TOKEN` environment variable
- **Added**: `GITHUB_FULL_NAME` as required variable for scheduling
- **Updated**: Configuration validation to require `GITHUB_FULL_NAME`

### 2. Automatic Token Retrieval
- **New Method**: `fetchAuthToken()` - Calls `POST /auth/login` endpoint
- **Interface**: `AuthLoginResponse` - Defines response structure from auth endpoint
- **Token Management**: Automatic retrieval and caching of JWT tokens

### 3. Token Lifecycle Management
- **Expiration Handling**: 24-hour default token lifetime
- **Automatic Renewal**: `ensureValidAuthToken()` method checks and renews tokens
- **Cache Management**: Local storage of token and expiry date

### 4. Enhanced Error Handling
- **Network Errors**: Proper handling of authentication failures
- **Token Validation**: Explicit null/empty checks for robust operation
- **Logging**: Comprehensive logging for debugging and monitoring

### 5. Updated Status Reporting
- **New Fields**: `authTokenValid` and `tokenExpiry` in status response
- **Security**: Token values are hidden in status output
- **Monitoring**: Better visibility into token state

## Technical Implementation

### Configuration Changes
```typescript
interface SchedulingConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  username: string;
  fullName: string;        // ← Added
  githubToken: string;     // ← Added
  baseUrl: string;
  // authToken: string;    // ← Removed
}
```

### Authentication Flow
1. **Startup**: Service validates required environment variables
2. **Before Execution**: `ensureValidAuthToken()` is called
3. **Token Check**: If no token or expired, `fetchAuthToken()` is called
4. **API Call**: `POST /auth/login` with user credentials
5. **Token Storage**: JWT token and expiry date are cached
6. **Execution**: Token is used for `POST /api/refresh/{username}`

### Error Handling
```typescript
// Explicit null/empty checks for TypeScript strict mode
if (this.authToken === null || this.authToken === '' || 
    this.tokenExpiry === null || this.tokenExpiry <= new Date()) {
  return this.fetchAuthToken();
}
```

## Benefits

### 1. User Experience
- **Simplified Setup**: No manual token generation required
- **Reduced Errors**: Eliminates token configuration mistakes
- **Automatic Management**: Tokens are handled transparently

### 2. Security
- **No Manual Storage**: Tokens are not stored in environment variables
- **Automatic Renewal**: Prevents expired token issues
- **Audit Trail**: All token operations are logged

### 3. Reliability
- **Robust Error Handling**: Graceful handling of authentication failures
- **Network Resilience**: Proper timeout and retry mechanisms
- **State Management**: Clear token lifecycle management

### 4. Maintainability
- **Cleaner Code**: Removes manual token management complexity
- **Better Testing**: Easier to test with automatic token handling
- **Documentation**: Clearer setup instructions

## Migration Guide

### For Existing Users
1. **Remove**: `SCHEDULE_AUTH_TOKEN` from `.env`
2. **Add**: `GITHUB_FULL_NAME` to `.env`
3. **Verify**: `GITHUB_USERNAME` and `GH_TOKEN` are set
4. **Restart**: Application to pick up new configuration

### Environment Variables
```env
# REQUIRED for scheduling
SCHEDULE_ENABLED=true
GITHUB_USERNAME=your_github_username
GITHUB_FULL_NAME=Your Full Name
GH_TOKEN=your_github_classic_token

# OPTIONAL scheduling configuration
SCHEDULE_FREQUENCY=weekly
SCHEDULE_TIME=02:00
SCHEDULE_TIMEZONE=Europe/Paris

# REMOVED (no longer needed)
# SCHEDULE_AUTH_TOKEN=
```

## Testing

### Manual Testing
```bash
# Test scheduling configuration
curl -X POST http://localhost:3000/api/refresh/username \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","fullName":"Test User","githubToken":"ghp_xxx"}' \
  | jq -r '.tokens.accessToken')"
```

### Automated Testing
- Unit tests for token management methods
- Integration tests for authentication flow
- Error handling tests for network failures

## Future Considerations

### Potential Enhancements
1. **Token Refresh**: Implement proactive token renewal before expiration
2. **Multiple Users**: Support for scheduling multiple GitHub users
3. **Token Rotation**: Automatic GitHub token rotation for security
4. **Metrics**: Add metrics for token usage and renewal frequency

### Monitoring
- Track token retrieval success/failure rates
- Monitor token expiration patterns
- Alert on authentication failures

## Conclusion

This decision significantly improves the user experience by eliminating manual token management while maintaining security and reliability. The automatic token management system is more robust, easier to configure, and reduces the potential for configuration errors. 