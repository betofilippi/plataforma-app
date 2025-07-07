# Real API Client Implementation

## Overview
Implemented a production-ready API client that connects to the actual backend APIs without any mock/simulation code. All mock data and fallback systems have been removed, ensuring the application only works with real business data.

## Key Changes

### 1. Created Production-Ready API Client (`/src/services/ApiClient.js`)
- **Real HTTP requests**: Uses axios for all API communications
- **Environment detection**: Automatically detects localhost vs production URLs
- **Retry logic**: Implements exponential backoff for network failures
- **Error handling**: Comprehensive error normalization and handling
- **Token management**: Automatic JWT token storage and refresh
- **Request interceptors**: Adds authentication headers automatically
- **Response interceptors**: Handles 401 errors with automatic token refresh

### 2. Removed Mock/Simulation Code from Authentication
- **Authentication Controller** (`/src/auth/authController.js`):
  - Removed all fallback mock user data
  - Removed development-only authentication bypasses
  - Now requires real database connections and valid credentials
  - No more hardcoded admin@plataforma.app fallbacks

### 3. Implemented Proper JWT Token Handling
- **Frontend Auth Utilities** (`/public/shared/js/common.js`):
  - Added refresh token storage and management
  - Implemented automatic token refresh on 401 errors
  - Added proper logout with token cleanup
  - Enhanced token validation and storage

### 4. Environment Detection and Configuration
- **API Configuration** (`/src/config/apiConfig.js`):
  - Centralized configuration management
  - Automatic environment detection (development/production)
  - Dynamic base URL selection:
    - localhost: `http://localhost:3001`
    - Production: `https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app`
  - Environment-specific timeouts and retry settings

### 5. Removed All Mock Data from Dashboard Routes
- **Dashboard Routes** (`/src/routes/dashboard.js`):
  - Removed all fallback mock data
  - Removed try-catch blocks with mock alternatives
  - Now requires real database connections
  - All queries must succeed or return proper errors

### 6. Updated ERP Module API Clients
- **CMP Module** (`/public/modules/cmp/js/cmp-api.js`):
  - Updated to use real backend URLs
  - Environment-aware base URL construction
  - Proper error handling without fallbacks

## Architecture

### API Client Structure
```
ApiClient
├── Configuration Management (apiConfig.js)
├── Request/Response Interceptors
├── Automatic Token Refresh
├── Retry Logic with Exponential Backoff
├── Environment Detection
└── Comprehensive Error Handling
```

### Environment Detection Logic
1. Check `NODE_ENV` environment variable
2. Browser hostname detection (`localhost` vs production domains)
3. `API_BASE_URL` environment variable analysis
4. Default to production URL if uncertain

### Authentication Flow
1. User submits credentials
2. API client sends request to `/auth/login`
3. Server validates credentials against real database
4. Returns JWT access token + refresh token
5. Tokens stored in localStorage
6. Automatic token refresh on 401 responses
7. Logout clears all auth data

## Configuration

### Environment Variables
```bash
# Production (default)
API_BASE_URL=https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app

# Development (localhost)
API_BASE_URL=http://localhost:3001
```

### Frontend Configuration
The frontend automatically detects environment based on:
- `window.location.hostname === 'localhost'`
- `window.location.hostname === '127.0.0.1'`

### API Endpoints
All endpoints are now centralized in the configuration:
- **Authentication**: `/auth/login`, `/auth/logout`, `/auth/refresh`
- **Dashboard**: `/dashboard/stats`, `/dashboard/activities`
- **CAD Module**: `/api/cad/clients`, `/api/cad/products`, `/api/cad/suppliers`
- **All other modules**: Follow the `/api/{module}/*` pattern

## Security Enhancements

### Token Security
- JWT tokens stored in localStorage (browser-only)
- Automatic token refresh prevents session expiration
- Secure token hash storage in database
- Session tracking with IP and User-Agent

### Request Security
- All requests include proper authentication headers
- HTTPS enforced in production
- Request timeouts prevent hanging connections
- Rate limiting on API endpoints

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Maximum 3 retry attempts
- Network error detection and classification
- User-friendly error messages

### Authentication Errors
- Automatic token refresh on 401 responses
- Graceful logout on refresh failure
- Redirect to login page when needed
- Clear error messaging for invalid credentials

### API Errors
- Structured error responses
- Error type classification (API_ERROR, NETWORK_ERROR, etc.)
- Development vs production error details
- Consistent error format across all endpoints

## Database Requirements

### Required Tables
The application now requires these database tables to exist:
- `auth_users` - User authentication data
- `auth_sessions` - Active user sessions
- `importacao_*` tables - All 18 integration tables
- Module-specific tables for CAD, CMP, etc.

### No Fallbacks
- No mock data if database is unavailable
- No development-only user accounts
- Real data validation and constraints
- Proper foreign key relationships

## API Client Usage

### Basic Usage
```javascript
const apiClient = new ApiClient();

// Login
const loginResult = await apiClient.login({ email, password });

// Get dashboard data
const stats = await apiClient.getDashboardStats();

// CRUD operations
const clients = await apiClient.getClients();
const client = await apiClient.createClient(clientData);
```

### Error Handling
```javascript
try {
  const data = await apiClient.getClients();
} catch (error) {
  if (error.type === 'NETWORK_ERROR') {
    // Handle network issues
  } else if (error.type === 'API_ERROR') {
    // Handle API errors
  }
}
```

## Production Readiness

### Performance
- Connection pooling via axios
- Request/response compression
- Efficient retry strategies
- Proper timeout management

### Monitoring
- Request/response logging in development
- Error tracking and classification
- Performance metrics collection
- Health check endpoints

### Scalability
- Stateless JWT token approach
- Horizontal scaling ready
- CDN-friendly static assets
- Efficient database queries

## Migration Notes

### Breaking Changes
- **No more mock data**: All endpoints require real database connections
- **Authentication required**: No development bypasses
- **Environment setup**: Must configure proper API URLs
- **Database schema**: All required tables must exist

### Testing
- Unit tests must use real API endpoints or proper mocking
- Integration tests require database setup
- End-to-end tests need full environment
- No more development shortcuts

## Next Steps

1. **Database Setup**: Ensure all required tables exist in target environments
2. **Environment Configuration**: Set proper API_BASE_URL for each environment
3. **Monitoring**: Implement production monitoring and alerting
4. **Documentation**: Update API documentation for all endpoints
5. **Testing**: Comprehensive testing with real data scenarios

This implementation provides a robust, production-ready API client that handles real business data without any mock fallbacks, ensuring the application works reliably in all environments.