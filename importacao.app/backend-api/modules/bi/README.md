# BI (Business Intelligence) Module

## Overview
The BI module provides comprehensive reporting and business intelligence capabilities for the ERP system, including dashboards, reports, and analytics.

## Features

### Dashboard System
- Executive dashboard with KPIs
- Module-specific dashboards
- Real-time data visualization
- Interactive charts and graphs
- Drill-down capabilities
- Performance metrics

### Report Generation
- Pre-defined business reports
- Custom report builder
- PDF and Excel export functionality
- Scheduled report delivery
- Financial reports
- Operational reports
- Compliance reports

### Analytics Features
- Sales analytics and forecasting
- Inventory analytics
- Financial analytics
- Customer analytics
- Supplier performance analytics
- Production efficiency reports

## API Endpoints

### Dashboards
- `GET /api/bi/dashboards/executive` - Executive dashboard data
- `GET /api/bi/dashboards/sales` - Sales dashboard
- `GET /api/bi/dashboards/inventory` - Inventory dashboard
- `GET /api/bi/dashboards/financial` - Financial dashboard
- `GET /api/bi/dashboards/production` - Production dashboard

### Reports
- `GET /api/bi/reports` - List available reports
- `POST /api/bi/reports/generate` - Generate custom report
- `GET /api/bi/reports/:id` - Get specific report
- `POST /api/bi/reports/export` - Export report (PDF/Excel)
- `POST /api/bi/reports/schedule` - Schedule report delivery

### Analytics
- `GET /api/bi/analytics/sales` - Sales analytics
- `GET /api/bi/analytics/inventory` - Inventory analytics
- `GET /api/bi/analytics/financial` - Financial analytics
- `GET /api/bi/analytics/customers` - Customer analytics
- `GET /api/bi/analytics/suppliers` - Supplier analytics

## Technical Implementation
- Uses Chart.js for visualizations
- Implements data filters and date ranges
- Responsive design for mobile
- Real-time data updates via WebSocket
- Export and sharing features

## Dependencies
- Chart.js for charts
- jsPDF for PDF generation
- SheetJS for Excel export
- Socket.io for real-time updates
- Moment.js for date handling