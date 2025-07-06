# VND Module - Vendas (Sales)

## Overview
The VND module handles all sales-related operations for the ERP system, including sales orders, customer quotations, sales pipeline management, commission tracking, and sales analytics.

## Features

### Sales Orders Management (vnd_01_pedidos_venda)
- Complete sales order lifecycle management
- Customer order processing and tracking
- Multi-status workflow (Pending → Confirmed → Production → Invoiced → Delivered)
- Integration with customers, products, and price lists
- Order cancellation and modification support
- Delivery tracking and completion
- Sales analytics and reporting

### Sales Quotations Management (vnd_04_orcamentos)
- Customer quotation creation and management
- Quotation validity tracking and expiration
- Automatic conversion to sales orders
- Quotation approval workflows
- Competitive quotation comparison
- Customer quotation history

### Sales Pipeline Management (vnd_06_pipeline)
- Complete sales opportunity tracking
- Multi-stage pipeline (Prospecting → Qualification → Proposal → Negotiation → Closing)
- Weighted value calculations based on probability
- Activity tracking and customer interactions
- Sales forecasting and pipeline analytics
- Lead source tracking and conversion metrics

### Commission Management (vnd_09_comissoes)
- Automatic commission calculation from sales
- Multiple commission types (Fixed, Percentage, Mixed)
- Commission payment tracking and history
- Sales target management and performance tracking
- Commission analytics by salesperson
- Integration with payroll systems

## API Endpoints

### Base URL: `/api/vnd`

#### Health Check
- `GET /health` - Module health status and endpoints

#### Sales Orders (`/sales-orders`)
- `GET /` - List all sales orders (with pagination and filters)
- `GET /stats` - Sales order statistics and metrics
- `GET /:id` - Get sales order by ID with full details
- `POST /` - Create new sales order
- `PATCH /:id/status` - Update sales order status
- `PATCH /:id/cancel` - Cancel sales order

#### Sales Quotations (`/quotations`)
- `GET /` - List all quotations (with pagination and filters)
- `GET /stats` - Quotation statistics and conversion rates
- `GET /:id` - Get quotation by ID with full details
- `POST /` - Create new quotation
- `PATCH /:id/status` - Update quotation status
- `POST /:id/convert-to-order` - Convert quotation to sales order

#### Sales Pipeline (`/pipeline`)
- `GET /` - List all pipeline opportunities (with pagination and filters)
- `GET /stats` - Pipeline statistics and forecasting
- `GET /:id` - Get opportunity by ID with full details
- `POST /` - Create new pipeline opportunity
- `PUT /:id` - Update opportunity details
- `PATCH /:id/move-stage` - Move opportunity to different stage
- `POST /:id/activities` - Add activity/interaction to opportunity

#### Commissions (`/commissions`)
- `GET /` - List all commissions (with pagination and filters)
- `GET /stats` - Commission statistics and analytics
- `GET /:id` - Get commission by ID with details
- `POST /` - Create new commission manually
- `PATCH /:id/pay` - Mark commission as paid
- `POST /calculate-from-orders` - Calculate commissions from sales orders
- `POST /targets` - Create sales target
- `GET /targets/performance` - Get sales targets performance

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
    "limit": 50,
    "total": 100,
    "totalPages": 2
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

## Validation Schemas

### Sales Order Validation
- `id_cliente`: Required positive integer (Customer ID)
- `id_empresa`: Required positive integer (Company ID)
- `id_vendedor`: Optional positive integer (Salesperson ID)
- `itens`: Array of items with minimum 1 item
- Each item must have: `id_produto`, `quantidade`, `preco_unitario`

### Sales Quotation Validation
- `numero_orcamento`: Required unique string, max 50 characters
- `id_cliente`: Required positive integer
- `data_validade`: Required valid datetime
- `descricao`: Required string, 1-500 characters
- `itens`: Array with minimum 1 item

### Pipeline Opportunity Validation
- `id_cliente`: Required positive integer
- `id_vendedor`: Required positive integer
- `titulo`: Required string, max 200 characters
- `valor_estimado`: Required number ≥ 0
- `probabilidade`: Required number 0-100
- `data_fechamento_prevista`: Required valid datetime

### Commission Validation
- `id_vendedor`: Required positive integer
- `tipo_comissao`: Required enum (FIXA, PERCENTUAL, MISTA)
- `valor_base`: Required number ≥ 0
- `valor_comissao`: Required number ≥ 0
- `data_referencia`: Required valid datetime

## Database Integration

### Tables Used
- `vnd_01_pedidos_venda` - Sales orders
- `vnd_02_itens_pedido_venda` - Sales order items
- `vnd_03_historico_pedidos` - Sales order history/status changes
- `vnd_04_orcamentos` - Sales quotations
- `vnd_05_itens_orcamento` - Quotation items
- `vnd_06_pipeline` - Sales pipeline opportunities
- `vnd_07_historico_pipeline` - Pipeline stage history
- `vnd_08_atividades_pipeline` - Pipeline activities/interactions
- `vnd_09_comissoes` - Commission records
- `vnd_10_metas_vendas` - Sales targets

### Relationships
- Sales orders link to customers (`cad_03_clientes`)
- Items link to products (`prd_03_produtos`)
- Salespeople link to users (`cad_05_usuarios`)
- Companies for multi-tenant support (`cad_01_empresas`)
- Price lists integration (`cad_06_listas_precos`)

## Business Logic

### Sales Order Workflow
1. **Creation** - Customer places order or salesperson creates order
2. **Validation** - System validates customer credit, product availability, pricing
3. **Confirmation** - Order is confirmed and enters production queue
4. **Production** - Items are manufactured or separated from stock
5. **Invoicing** - Fiscal documents are generated
6. **Delivery** - Products are shipped to customer
7. **Completion** - Order is marked as delivered and completed

### Quotation Workflow
1. **Creation** - Salesperson creates quotation for customer
2. **Validation** - System validates products and pricing
3. **Approval** - Internal approval if needed
4. **Customer Review** - Quotation is sent to customer
5. **Negotiation** - Price and terms adjustments
6. **Acceptance** - Customer accepts quotation
7. **Conversion** - Quotation is converted to sales order

### Pipeline Management Workflow
1. **Prospecting** - Initial customer contact and qualification
2. **Qualification** - Assess customer needs and budget
3. **Proposal** - Present solution and create quotation
4. **Negotiation** - Adjust terms and pricing
5. **Closing** - Final approval and contract signing
6. **Won/Lost** - Opportunity resolution and analysis

### Commission Calculation
1. **Automatic** - System calculates based on sales order completion
2. **Manual** - Finance team creates commission records manually
3. **Validation** - Commission amounts are validated
4. **Approval** - Management approves commission payments
5. **Payment** - Commissions are paid to salespeople

## Status Management

### Sales Order Statuses
- `PENDENTE` - Pending confirmation
- `CONFIRMADO` - Confirmed and approved
- `PRODUCAO` - In production/preparation
- `SEPARACAO` - Being separated from stock
- `FATURADO` - Invoiced and ready for delivery
- `ENTREGUE` - Delivered to customer
- `CANCELADO` - Cancelled order

### Quotation Statuses
- `PENDENTE` - Awaiting customer response
- `APROVADO` - Accepted by customer
- `REJEITADO` - Rejected by customer
- `VENCIDO` - Expired quotation
- `CONVERTIDO` - Converted to sales order

### Pipeline Stages
- `PROSPECCAO` - Initial prospecting
- `QUALIFICACAO` - Lead qualification
- `PROPOSTA` - Proposal presentation
- `NEGOCIACAO` - Terms negotiation
- `FECHAMENTO` - Final closing
- `GANHO` - Won opportunity
- `PERDIDO` - Lost opportunity

### Commission Types
- `FIXA` - Fixed amount commission
- `PERCENTUAL` - Percentage-based commission
- `MISTA` - Mixed fixed + percentage commission

## Performance Features
- Optimized database queries with proper indexing
- Pagination support for large datasets
- Efficient bulk operations and calculations
- Statistics caching for dashboards
- Advanced filtering and search capabilities
- Real-time pipeline value calculations

## Security Features
- JWT authentication on all routes
- Input validation and sanitization
- SQL injection prevention via Knex.js
- Transaction support for data consistency
- Audit trails for all modifications
- Role-based access control integration

## Analytics and Reporting

### Sales Metrics
- Total sales orders and revenue
- Sales by period (day/week/month/year)
- Top selling products and categories
- Customer analysis and segmentation
- Salesperson performance rankings
- Sales conversion rates

### Pipeline Metrics
- Total pipeline value and weighted value
- Conversion rates by stage
- Average deal size and sales cycle
- Lead source performance
- Forecast accuracy
- Win/loss analysis

### Commission Metrics
- Total commissions paid and pending
- Commission by salesperson
- Commission trends and analytics
- Target vs achievement tracking
- Commission cost analysis

## Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Database transaction rollbacks on errors
- Validation error aggregation
- Detailed error reporting for debugging

## Integration Points
- **CAD Module**: Customers, companies, users, price lists
- **PRD Module**: Products, inventory, pricing
- **EST Module**: Stock levels and reservations
- **FIS Module**: Tax calculations and fiscal documents
- **FIN Module**: Payment processing and receivables

## File Structure
```
backend/modules/vnd/
├── controllers/
│   ├── salesOrdersController.js
│   ├── quotationsController.js
│   ├── pipelineController.js
│   └── commissionsController.js
├── services/
│   └── validationService.js
├── routes/
│   ├── index.js
│   ├── salesOrders.js
│   ├── quotations.js
│   ├── pipeline.js
│   └── commissions.js
└── README.md
```

## Development Setup

1. Ensure database connection is configured
2. Run migrations to create required tables
3. Start the backend server
4. Access endpoints at `http://localhost:3001/api/vnd/`

## Testing
Use the health check endpoint to verify the module is working:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/vnd/health
```

## Next Steps
- Implement frontend components for sales management
- Add email notifications for order status changes
- Integrate with customer portal for order tracking
- Add advanced sales analytics and dashboards
- Implement automated commission calculations
- Add sales forecasting and predictive analytics
- Integrate with marketing automation tools