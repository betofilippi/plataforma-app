# ERP Backend API - Complete Deployment Guide

This is a complete, functional backend API for the ERP system with real SQLite database integration, ready for immediate deployment.

## 🚀 Features

- **Complete Authentication System**: JWT-based authentication with refresh tokens
- **Real Database**: SQLite database with comprehensive schema and sample data
- **Dashboard API**: Real statistics and activity feeds
- **CAD Module**: Complete CRUD operations for Clients, Products, and Suppliers
- **Ready for Deployment**: Optimized for Vercel with serverless configuration
- **Sample Data**: Pre-seeded with admin user and sample business data

## 📋 API Endpoints

### Authentication
- `POST /auth/login` - User login with email/password
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/activities` - Get recent activities
- `GET /dashboard/integrations` - Get integration status

### Clients (CAD)
- `GET /api/cad/clients` - List all clients with pagination
- `GET /api/cad/clients/:id` - Get client by ID
- `POST /api/cad/clients` - Create new client
- `PUT /api/cad/clients/:id` - Update client
- `DELETE /api/cad/clients/:id` - Delete client
- `GET /api/cad/clients/stats` - Get client statistics
- `GET /api/cad/clients/select` - Get clients for dropdown

### Products (CAD)
- `GET /api/cad/products` - List all products with pagination
- `GET /api/cad/products/:id` - Get product by ID
- `POST /api/cad/products` - Create new product
- `PUT /api/cad/products/:id` - Update product
- `DELETE /api/cad/products/:id` - Delete product

### Suppliers (CAD)
- `GET /api/cad/suppliers` - List all suppliers with pagination
- `GET /api/cad/suppliers/:id` - Get supplier by ID
- `POST /api/cad/suppliers` - Create new supplier
- `PUT /api/cad/suppliers/:id` - Update supplier
- `DELETE /api/cad/suppliers/:id` - Delete supplier

## 🗄️ Database Schema

The system includes complete database tables:

### Core Tables
- `auth_users` - User authentication and profiles
- `auth_sessions` - JWT session management
- `importacao_clientes` - Customer management
- `importacao_produtos` - Product catalog
- `importacao_fornecedores` - Supplier management
- `importacao_categorias` - Product categories
- `importacao_estoque` - Inventory management
- `importacao_vendas` - Sales records
- `importacao_pedidos` - Order management

### Integration Tables
- `importacao_integracao_ml` - Mercado Livre integration
- `importacao_integracao_instagram` - Instagram integration
- `importacao_integracao_bling` - Bling ERP integration
- `importacao_integracao_supabase` - Supabase integration
- `importacao_integracao_zapi` - WhatsApp integration
- `importacao_integracao_make` - Make.com automation

## 👤 Default Admin User

The system comes pre-configured with an admin user:

- **Email**: `admin@nxt.com`
- **Password**: `admin123`
- **Role**: `admin`

## 🔧 Local Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test the API
npm run test:api
```

The server will start on `http://localhost:3001`

### Environment Variables
Copy `.env` file and update as needed:

```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
DB_PATH=./database/erp_nxt.sqlite
```

## 🚀 Deployment to Vercel

### Quick Deploy
1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
vercel --prod
```

### Environment Variables in Vercel
Set these environment variables in your Vercel dashboard:

- `JWT_SECRET`: Your secure JWT secret key
- `NODE_ENV`: `production`
- `DB_PATH`: `/tmp/erp_nxt_production.sqlite` (for serverless)

### Vercel Configuration
The project includes a `vercel.json` configuration optimized for serverless deployment with:
- SQLite database support
- Proper CORS headers
- Function timeout settings
- Memory allocation
- Environment variable management

## 📊 Sample Data

The database is automatically seeded with:

### Clients (5 records)
- João da Silva (Individual)
- Maria Santos (Individual)  
- Empresa XYZ Ltda (Company)
- Pedro Oliveira (Individual)
- Ana Costa (Individual)

### Products (8 records)
- Smartphone Samsung Galaxy A54
- Camiseta Polo Masculina
- Jogo de Panelas Antiaderente
- Livro "Programação JavaScript"
- Tênis Esportivo Nike Air
- Notebook Dell Inspiron
- Vestido Floral Feminino
- Aspirador de Pó Robô

### Suppliers (3 records)
- TechSupply Ltda
- Moda Fashion Distribuidora
- Casa Verde Importadora

### Categories (5 records)
- Eletrônicos
- Roupas
- Casa e Jardim
- Livros
- Esportes

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Session management in database
- CORS protection
- Rate limiting
- Helmet security headers
- Input validation and sanitization

## 📈 Performance Optimizations

- SQLite with WAL mode for better concurrency
- Connection pooling
- Query optimization
- Serverless-optimized database configuration
- Compression middleware
- Memory management for serverless environments

## 🧪 Testing

Test the API endpoints:

```bash
# Run all API tests
npm run test:api

# Test individual endpoints
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nxt.com","password":"admin123"}'
```

## 📱 Frontend Integration

The API is ready to integrate with any frontend application. Example authentication:

```javascript
// Login
const loginResponse = await fetch('https://your-api.vercel.app/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@nxt.com',
    password: 'admin123'
  })
});

const { data } = await loginResponse.json();
const token = data.access_token;

// Use token for authenticated requests
const clientsResponse = await fetch('https://your-api.vercel.app/api/cad/clients', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🔍 Monitoring and Logs

Check application health:
- Health check: `GET /health`
- Database health: `GET /health/db`

All endpoints return structured JSON responses with proper HTTP status codes and error handling.

## 📝 API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚨 Production Considerations

1. **Change Default Password**: Update the admin password after first login
2. **Environment Variables**: Use secure JWT secrets in production
3. **Database Backups**: Implement backup strategy for production data
4. **Monitoring**: Set up application monitoring and alerting
5. **Rate Limiting**: Adjust rate limits based on usage patterns
6. **SSL/TLS**: Ensure HTTPS in production (handled by Vercel)

## 📞 Support

The API is fully functional and ready for production use. All endpoints have been tested with real database operations and include proper error handling, validation, and security measures.

## 🎯 Next Steps

1. Deploy to Vercel using the provided configuration
2. Update environment variables in Vercel dashboard
3. Test all endpoints in production
4. Integrate with your frontend application
5. Monitor performance and usage
6. Scale based on requirements

The backend is now complete and ready for immediate deployment and use!