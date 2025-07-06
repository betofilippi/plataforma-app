# CAD Module - Cadastros (Registrations)

## Overview
The CAD module handles all master data registration operations for the ERP system, including clients, suppliers, and products management.

## Features

### Clients Management (cad_03_clientes)
- Complete CRUD operations
- Support for both individual (F) and corporate (J) clients
- CPF/CNPJ validation
- Purchase history tracking
- Client classification (A, B, C, D)
- Advanced search and filtering
- Statistics and reporting

### Suppliers Management (cad_04_fornecedores)
- Full supplier lifecycle management
- Performance metrics tracking
- Multiple supplier types support
- Purchase statistics integration
- CSV export functionality
- Advanced search capabilities

### Products Management (prd_03_produtos)
- Comprehensive product catalog
- Category and subcategory management
- Price management with margin calculations
- Stock integration ready
- Bulk operations support
- Product duplication
- Advanced filtering and search

## API Endpoints

### Base URL: `/api/cad`

#### Health Check
- `GET /health` - Module health status

#### Clients (`/clients`)
- `GET /` - List all clients (with pagination and filters)
- `GET /stats` - Client statistics
- `GET /select` - Clients for dropdown/select components
- `POST /search` - Advanced search
- `GET /export` - Export clients to CSV
- `GET /:id` - Get client by ID
- `POST /` - Create new client
- `PUT /:id` - Update client
- `DELETE /:id` - Delete client
- `PATCH /:id/toggle-status` - Toggle client active status

#### Suppliers (`/suppliers`)
- `GET /` - List all suppliers (with pagination and filters)
- `GET /stats` - Supplier statistics
- `GET /select` - Suppliers for dropdown/select components
- `GET /types` - Available supplier types
- `POST /search` - Advanced search
- `GET /export` - Export suppliers to CSV
- `GET /:id` - Get supplier by ID
- `GET /:id/performance` - Supplier performance metrics
- `POST /` - Create new supplier
- `PUT /:id` - Update supplier
- `DELETE /:id` - Delete supplier
- `PATCH /:id/toggle-status` - Toggle supplier active status

#### Products (`/products`)
- `GET /` - List all products (with pagination and filters)
- `GET /stats` - Product statistics
- `GET /select` - Products for dropdown/select components
- `GET /categories` - Product categories
- `GET /categories/:category/subcategories` - Subcategories
- `GET /types` - Product types for filters
- `POST /search` - Advanced search
- `GET /export` - Export products to CSV
- `PUT /bulk-update-prices` - Bulk price updates
- `GET /:id` - Get product by ID
- `POST /:id/duplicate` - Duplicate product
- `POST /` - Create new product
- `PUT /:id` - Update product
- `DELETE /:id` - Delete product
- `PATCH /:id/toggle-status` - Toggle product active status

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Request/Response Format

### Standard Success Response
```json
{
  "success": true,
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human readable error message",
  "details": {...}
}
```

## Validation

The module uses Zod schemas for comprehensive input validation:

### Client Validation
- `tipo_pessoa`: Must be 'F' (individual) or 'J' (corporate)
- `cnpj_cpf`: Valid CPF (11 digits) or CNPJ (14 digits)
- `nome_razao_social`: Required, 1-200 characters
- `email`: Valid email format
- `telefone`: Valid phone format

### Supplier Validation
- Similar to client validation
- Additional `tipo_fornecedor`: MATERIA_PRIMA, SERVICO, PRODUTO_ACABADO, etc.
- `classificacao`: A, B, C, D classification

### Product Validation
- `descricao`: Required, 1-200 characters
- `codigo_produto`: Unique product code
- `preco_venda`: Positive number
- `preco_custo`: Optional positive number
- `margem_lucro`: Calculated or manual percentage

## Database Integration

### Tables Used
- `cad_03_clientes` - Client data
- `cad_04_fornecedores` - Supplier data
- `prd_03_produtos` - Product data
- Integration with `importacao_` tables for purchase history

### Relationships
- Products can have suppliers (many-to-many via purchase records)
- Clients have purchase history
- Suppliers have performance metrics

## Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Database connection fallback for development
- Validation error aggregation

## Performance Features
- Optimized database queries
- Pagination support
- Index-optimized searches
- Bulk operations for efficiency
- CSV export for large datasets

## Security Features
- JWT authentication on all routes
- Input validation and sanitization
- SQL injection prevention via Knex.js
- Rate limiting ready
- Audit logging ready

## Development Setup

1. Ensure database connection is configured in `/backend/src/database/connection.js`
2. Run migrations to create required tables
3. Start the backend server
4. Access endpoints at `http://localhost:3001/api/cad/`

## Testing
Use the health check endpoint to verify the module is working:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/cad/health
```

## Integration Notes
- Ready for integration with EST (Stock) module
- Compatible with CMP (Purchases) module
- Prepared for VND (Sales) module integration
- Frontend components can be built to consume these APIs directly

## File Structure
```
backend/modules/cad/
├── controllers/
│   ├── clientsController.js
│   ├── suppliersController.js
│   └── productsController.js
├── services/
│   ├── validationService.js
│   ├── clientsService.js
│   ├── suppliersService.js
│   └── productsService.js
├── routes/
│   ├── index.js
│   ├── clients.js
│   ├── suppliers.js
│   └── products.js
└── README.md
```