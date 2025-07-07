# Vercel Deployment Guide - Plataforma ERP Backend

This guide will help you deploy the Plataforma ERP Backend to Vercel as a serverless API.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Database**: Set up a managed PostgreSQL database (recommended: Supabase, PlanetScale, or Neon)
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Database Setup

### Option A: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → Database
3. Copy the connection string (it looks like: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`)
4. Enable Row Level Security if needed
5. Run your migrations (see Database Migrations section)

### Option B: Other PostgreSQL Providers

- **Neon**: [neon.tech](https://neon.tech)
- **PlanetScale**: [planetscale.com](https://planetscale.com)
- **AWS RDS**: [aws.amazon.com/rds](https://aws.amazon.com/rds)

## Step 2: Environment Variables

1. Copy `.env.vercel` to your clipboard
2. Go to your Vercel project dashboard
3. Navigate to Settings → Environment Variables
4. Add the following **required** variables:

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
CORS_ORIGIN=https://yourfrontend.com,https://www.yourfrontend.com
```

5. Add optional variables based on your needs (email, integrations, etc.)

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

### Option B: Git Integration

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Set your environment variables
6. Click "Deploy"

## Step 4: Database Migrations

After deployment, run your database migrations:

```bash
# If using Supabase
npx supabase db push

# If using custom migrations
# Connect to your database and run the SQL files in src/database/migrations/
```

## Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Test the health endpoint: `https://your-project.vercel.app/health`
3. Test the API endpoints: `https://your-project.vercel.app/api/test`

## Available Endpoints

After deployment, your API will be available at:

- **Health Check**: `GET /health`
- **Database Health**: `GET /health/db`
- **API Test Suite**: `GET /api/test`
- **Authentication**: `POST /auth/login`, `POST /auth/register`
- **Modules**:
  - CAD (Cadastros): `/api/cad/*`
  - EST (Estoque): `/api/est/*`
  - IMP (Importação): `/api/imp/*`
  - BI (Analytics): `/api/bi/*`
  - VND (Vendas): `/api/vnd/*`
  - CMP (Compras): `/api/cmp/*`
  - And more...

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check your DATABASE_URL format
   - Ensure your database allows connections from Vercel's IP ranges
   - Verify SSL settings (`sslmode=require` for most managed services)

2. **JWT Errors**
   - Ensure JWT_SECRET is at least 32 characters long
   - Check that JWT_SECRET is set in environment variables

3. **CORS Issues**
   - Add your frontend domains to CORS_ORIGIN
   - Ensure domains include protocol (https://)

4. **Cold Start Issues**
   - Serverless functions may take time to warm up
   - Consider using a monitoring service to keep functions warm

### Debug Mode

Enable debug mode by adding these environment variables:

```bash
DEBUG=true
LOG_LEVEL=debug
```

### Function Limits

Vercel has the following limits:
- **Hobby Plan**: 10 second execution time, 1024MB memory
- **Pro Plan**: 15 second execution time, 3008MB memory
- **Enterprise**: 30 second execution time, 3008MB memory

## Monitoring

### Built-in Monitoring

The API includes built-in monitoring endpoints:

- `/health` - General health check
- `/health/db` - Database health check
- `/api/test` - Full test suite

### External Monitoring

Consider setting up:

1. **Uptime Monitoring**: Pingdom, UptimeRobot
2. **Error Tracking**: Sentry, LogRocket
3. **Performance Monitoring**: New Relic, Datadog

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **CORS**: Only allow necessary domains
3. **Rate Limiting**: Configured to prevent abuse
4. **Headers**: Security headers are automatically set
5. **SSL**: Always use HTTPS in production

## Custom Domains

To use a custom domain:

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS settings as instructed
5. Update CORS_ORIGIN to include your custom domain

## Scaling

Vercel automatically scales your serverless functions based on demand. For high-traffic applications, consider:

1. **Database Connection Pooling**: Use connection pooling services
2. **Caching**: Implement Redis or similar caching layer
3. **CDN**: Use Vercel's built-in CDN for static assets

## Cost Optimization

1. **Function Duration**: Optimize database queries to reduce execution time
2. **Memory Usage**: Monitor memory usage and adjust if needed
3. **Bandwidth**: Minimize response payload sizes
4. **Executions**: Implement caching to reduce function executions

## Support

For issues with:
- **Vercel Platform**: [vercel.com/support](https://vercel.com/support)
- **This API**: Create an issue in your repository
- **Database**: Check your database provider's documentation

## Next Steps

1. Set up monitoring and alerts
2. Configure CI/CD pipeline
3. Set up staging environment
4. Implement automated testing
5. Configure backup strategy for your database

---

**Happy Deploying! 🚀**