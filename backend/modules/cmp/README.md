# CMP Module - Compras (Purchases)

## Overview
The CMP module handles all purchase-related operations for the ERP system, including purchase orders, supplier quotations, purchase requisitions, and approval workflows.

## Features

### Purchase Orders Management (cmp_01_pedidos_compra)
- Complete purchase order lifecycle management
- Multi-level approval workflows
- Purchase order status tracking
- Integration with suppliers and products
- Cost center management
- Delivery tracking
- Purchase analytics and reporting

### Quotations Management (cmp_04_cotacoes)
- Supplier quotation requests
- Quotation comparison tools
- Automatic conversion to purchase orders
- Quotation validity tracking
- Supplier response management

### Purchase Requisitions (cmp_06_requisicoes_compra)
- Internal purchase request system
- Department-based requisitions
- Approval workflows
- Conversion to quotation requests
- Budget estimation and tracking

## API Endpoints

### Base URL: `/api/cmp`

#### Health Check
- `GET /health` - Module health status and endpoints

#### Purchase Orders (`/purchase-orders`)
- `GET /` - List all purchase orders (with pagination and filters)
- `GET /stats` - Purchase order statistics
- `GET /:id` - Get purchase order by ID with full details
- `POST /` - Create new purchase order
- `PUT /:id` - Update purchase order
- `PATCH /:id/approve` - Approve/reject purchase order
- `PATCH /:id/cancel` - Cancel purchase order

#### Quotations (`/quotations`)
- `GET /` - List all quotations (with pagination and filters)
- `GET /stats` - Quotation statistics
- `GET /:id` - Get quotation by ID with full details
- `POST /` - Create new quotation
- `PATCH /:id/status` - Update quotation status
- `POST /:id/convert-to-order` - Convert quotation to purchase order

#### Purchase Requisitions (`/requisitions`)
- `GET /` - List all requisitions (with pagination and filters)
- `GET /stats` - Requisition statistics
- `GET /:id` - Get requisition by ID with full details
- `POST /` - Create new requisition
- `PATCH /:id/approve` - Approve/reject requisition
- `POST /:id/convert-to-quotation` - Convert requisition to quotation request

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

### Purchase Order Validation
- `id_fornecedor`: Required positive integer
- `id_empresa`: Required positive integer
- `descricao`: Required string, 1-500 characters
- `itens`: Array of items with minimum 1 item
- Each item must have: `id_produto`, `quantidade`, `preco_unitario`

### Quotation Validation
- `numero_cotacao`: Required unique string, max 50 characters
- `id_fornecedor`: Required positive integer
- `data_validade`: Required valid datetime
- `itens`: Array with minimum 1 item

### Purchase Requisition Validation
- `departamento`: Required string, max 100 characters
- `justificativa`: Required string, max 1000 characters
- `data_necessidade`: Required valid datetime
- `itens`: Array with minimum 1 item

## Database Integration

### Tables Used
- `cmp_01_pedidos_compra` - Purchase orders
- `cmp_02_itens_pedido_compra` - Purchase order items
- `cmp_03_aprovacoes_compra` - Purchase order approvals
- `cmp_04_cotacoes` - Quotations
- `cmp_05_itens_cotacao` - Quotation items
- `cmp_06_requisicoes_compra` - Purchase requisitions
- `cmp_07_itens_requisicao` - Requisition items

### Relationships
- Purchase orders link to suppliers (`cad_04_fornecedores`)
- Items link to products (`prd_03_produtos`)
- Users for requesters and approvers (`cad_05_usuarios`)
- Companies for multi-tenant support (`cad_01_empresas`)

## Business Logic

### Purchase Order Workflow
1. **Creation** - User creates purchase order with items
2. **Validation** - System validates supplier, products, and pricing
3. **Approval** - Orders above threshold require approval
4. **Processing** - Approved orders can be sent to suppliers
5. **Delivery** - Track delivery status and completion

### Quotation Workflow
1. **Request** - Create quotation request to supplier
2. **Response** - Supplier provides pricing and terms
3. **Evaluation** - Compare quotations from multiple suppliers
4. **Selection** - Choose best quotation
5. **Conversion** - Convert selected quotation to purchase order

### Requisition Workflow
1. **Request** - Department creates internal purchase request
2. **Justification** - Provide business justification
3. **Approval** - Manager/buyer approves requisition
4. **Quotation** - Convert to supplier quotation requests
5. **Purchase** - Process through normal purchase workflow

## Status Management

### Purchase Order Statuses
- `PENDENTE` - Awaiting approval
- `APROVADO` - Approved and ready to process
- `REJEITADO` - Rejected by approver
- `CANCELADO` - Cancelled by user
- `ENTREGUE` - Delivered and completed

### Quotation Statuses
- `PENDENTE` - Awaiting supplier response
- `APROVADA` - Accepted quotation
- `REJEITADA` - Rejected quotation
- `VENCIDA` - Expired quotation
- `CONVERTIDA` - Converted to purchase order

### Requisition Statuses
- `PENDENTE` - Awaiting approval
- `APROVADA` - Approved for processing
- `REJEITADA` - Rejected by approver
- `COTACAO_SOLICITADA` - Converted to quotation requests

## Performance Features
- Optimized database queries with proper indexing
- Pagination support for large datasets
- Efficient bulk operations
- Statistics caching for dashboards
- Advanced filtering and search capabilities

## Security Features
- JWT authentication on all routes
- Input validation and sanitization
- SQL injection prevention via Knex.js
- Transaction support for data consistency
- Audit trails for all modifications

## Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Database transaction rollbacks on errors
- Validation error aggregation
- Detailed error reporting for debugging

## Integration Points
- **CAD Module**: Suppliers, products, companies, users
- **EST Module**: Stock levels and reservations
- **FIS Module**: Tax calculations and fiscal documents
- **FIN Module**: Payment processing and accounting

## File Structure
```
backend/modules/cmp/
├── controllers/
│   ├── purchaseOrdersController.js
│   ├── quotationsController.js
│   └── requisitionsController.js
├── services/
│   └── validationService.js
├── routes/
│   ├── index.js
│   ├── purchaseOrders.js
│   ├── quotations.js
│   └── requisitions.js
└── README.md
```

## Development Setup

1. Ensure database connection is configured
2. Run migrations to create required tables
3. Start the backend server
4. Access endpoints at `http://localhost:3001/api/cmp/`

## Testing
Use the health check endpoint to verify the module is working:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/cmp/health
```

## Next Steps
- Implement frontend components
- Add email notifications for approvals
- Integrate with supplier portals
- Add advanced reporting features
- Implement budget controls and limits