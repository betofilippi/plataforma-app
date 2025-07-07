# API Directory - Vercel Serverless Functions

This directory contains the Vercel serverless functions for the Plataforma ERP Backend API.

## Structure

```
api/
├── index.js     # Main API entry point - handles all routes
├── health.js    # Health check endpoint
├── test.js      # API test suite endpoint
└── README.md    # This file
```

## Main Files

### `index.js`
- **Purpose**: Main serverless function that handles all API routes
- **Routes**: All application routes are handled through this single entry point
- **Features**:
  - CORS configuration
  - Rate limiting
  - Database connection management
  - Error handling
  - Security headers
  - Route forwarding to appropriate controllers

### `health.js`
- **Purpose**: Health check endpoint for monitoring
- **Endpoint**: `GET /health`
- **Features**:
  - Database connectivity check
  - Response time measurement
  - System status information
  - Deployment metadata

### `test.js`
- **Purpose**: Comprehensive API test suite
- **Endpoint**: `GET /api/test`
- **Features**:
  - Environment variable validation
  - Database connectivity tests
  - CORS configuration validation
  - Authentication setup verification
  - API endpoint availability check

## How It Works

Vercel's serverless functions work by:

1. **Single Entry Point**: All requests go through `/api/index.js`
2. **Express App**: The main file exports an Express application
3. **Route Handling**: Express routes are configured to handle different endpoints
4. **Database Connection**: Database connections are managed per request
5. **Cold Starts**: Functions may experience cold starts after periods of inactivity

## Environment Variables

The API requires these environment variables to be set in Vercel:

### Required
- `NODE_ENV`: Set to "production"
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens

### Optional
- `CORS_ORIGIN`: Comma-separated list of allowed origins
- `RATE_LIMIT_MAX`: Maximum requests per window
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds

## Local Development

To test the serverless functions locally:

```bash
# Install Vercel CLI
npm install -g vercel

# Run in development mode
vercel dev

# Or use npm script
npm run vercel:dev
```

## Deployment

The API is automatically deployed when you push to your connected Git repository, or you can deploy manually:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Or use npm scripts
npm run vercel:deploy
```

## Monitoring

Monitor your API health using these endpoints:

- `GET /health` - General health check
- `GET /health/db` - Database health check  
- `GET /api/test` - Full test suite

## Performance Considerations

### Cold Starts
- Functions may take 1-3 seconds to start after inactivity
- Keep functions warm with periodic health checks
- Optimize imports and initialization code

### Database Connections
- Use connection pooling for better performance
- Implement connection reuse where possible
- Set appropriate timeouts for database operations

### Memory Usage
- Monitor memory usage in Vercel dashboard
- Optimize for the allocated memory limit
- Consider increasing memory for heavy operations

## Error Handling

The API includes comprehensive error handling:

- **Global Error Handler**: Catches all unhandled errors
- **Validation Errors**: Proper error messages for invalid input
- **Database Errors**: Graceful handling of database connection issues
- **Rate Limiting**: Proper error responses for rate limit exceeded

## Security

Security features implemented:

- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Express-validator for request validation
- **JWT Authentication**: Secure token-based authentication

## Debugging

Enable debug mode with environment variables:

```bash
DEBUG=true
LOG_LEVEL=debug
```

Debug information will be available in Vercel's function logs.

## Limits

Vercel serverless functions have these limits:

- **Execution Time**: 10-30 seconds (depending on plan)
- **Memory**: 1024MB - 3008MB (depending on plan)
- **Payload Size**: 4.5MB request/response
- **Concurrent Executions**: 1000 (hobby) / 10000 (pro)

## Support

For issues:
1. Check the Vercel function logs
2. Test endpoints individually
3. Verify environment variables
4. Check database connectivity
5. Review the deployment guide

## Related Files

- `../vercel.json` - Vercel configuration
- `../package.json` - Dependencies and scripts
- `../VERCEL_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `../.env.vercel` - Environment variables template