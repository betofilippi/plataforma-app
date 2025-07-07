/**
 * Dashboard Service
 * Handles dashboard data aggregation and KPI calculations
 */

const { supabase } = require('../../../src/config/database');
const logger = require('../../../utils/logger');
const moment = require('moment');

class DashboardService {
  constructor() {
    this.db = supabase;
  }

  /**
   * Get executive dashboard data
   */
  async getExecutiveDashboard({ dateRange, companyId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Get KPIs
      const kpis = await this.getExecutiveKPIs({ startDate, endDate, companyId });
      
      // Get revenue trend
      const revenueTrend = await this.getRevenueTrend({ startDate, endDate, companyId });
      
      // Get top products
      const topProducts = await this.getTopProducts({ startDate, endDate, companyId });
      
      // Get customer metrics
      const customerMetrics = await this.getCustomerMetrics({ startDate, endDate, companyId });
      
      // Get inventory alerts
      const inventoryAlerts = await this.getInventoryAlerts({ companyId });
      
      // Get financial summary
      const financialSummary = await this.getFinancialSummary({ startDate, endDate, companyId });

      return {
        kpis,
        revenueTrend,
        topProducts,
        customerMetrics,
        inventoryAlerts,
        financialSummary,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting executive dashboard:', error);
      throw error;
    }
  }

  /**
   * Get sales dashboard data
   */
  async getSalesDashboard({ dateRange, companyId, salesTeam, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Get sales KPIs
      const salesKPIs = await this.getSalesKPIs({ startDate, endDate, companyId, salesTeam });
      
      // Get sales by period
      const salesByPeriod = await this.getSalesByPeriod({ startDate, endDate, companyId, salesTeam });
      
      // Get sales pipeline
      const salesPipeline = await this.getSalesPipeline({ companyId, salesTeam });
      
      // Get top customers
      const topCustomers = await this.getTopCustomers({ startDate, endDate, companyId, salesTeam });
      
      // Get sales team performance
      const teamPerformance = await this.getSalesTeamPerformance({ startDate, endDate, companyId, salesTeam });
      
      // Get conversion funnel
      const conversionFunnel = await this.getConversionFunnel({ startDate, endDate, companyId, salesTeam });

      return {
        salesKPIs,
        salesByPeriod,
        salesPipeline,
        topCustomers,
        teamPerformance,
        conversionFunnel,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting sales dashboard:', error);
      throw error;
    }
  }

  /**
   * Get inventory dashboard data
   */
  async getInventoryDashboard({ dateRange, companyId, warehouseId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Get inventory KPIs
      const inventoryKPIs = await this.getInventoryKPIs({ startDate, endDate, companyId, warehouseId });
      
      // Get stock levels
      const stockLevels = await this.getStockLevels({ companyId, warehouseId });
      
      // Get inventory movements
      const inventoryMovements = await this.getInventoryMovements({ startDate, endDate, companyId, warehouseId });
      
      // Get low stock alerts
      const lowStockAlerts = await this.getLowStockAlerts({ companyId, warehouseId });
      
      // Get inventory turnover
      const inventoryTurnover = await this.getInventoryTurnover({ startDate, endDate, companyId, warehouseId });
      
      // Get ABC analysis
      const abcAnalysis = await this.getABCAnalysis({ startDate, endDate, companyId, warehouseId });

      return {
        inventoryKPIs,
        stockLevels,
        inventoryMovements,
        lowStockAlerts,
        inventoryTurnover,
        abcAnalysis,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting inventory dashboard:', error);
      throw error;
    }
  }

  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard({ dateRange, companyId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Get financial KPIs
      const financialKPIs = await this.getFinancialKPIs({ startDate, endDate, companyId });
      
      // Get cash flow
      const cashFlow = await this.getCashFlow({ startDate, endDate, companyId });
      
      // Get profit and loss
      const profitLoss = await this.getProfitLoss({ startDate, endDate, companyId });
      
      // Get accounts receivable
      const accountsReceivable = await this.getAccountsReceivable({ companyId });
      
      // Get accounts payable
      const accountsPayable = await this.getAccountsPayable({ companyId });
      
      // Get expense breakdown
      const expenseBreakdown = await this.getExpenseBreakdown({ startDate, endDate, companyId });

      return {
        financialKPIs,
        cashFlow,
        profitLoss,
        accountsReceivable,
        accountsPayable,
        expenseBreakdown,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting financial dashboard:', error);
      throw error;
    }
  }

  /**
   * Get production dashboard data
   */
  async getProductionDashboard({ dateRange, companyId, productionLineId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Get production KPIs
      const productionKPIs = await this.getProductionKPIs({ startDate, endDate, companyId, productionLineId });
      
      // Get production efficiency
      const productionEfficiency = await this.getProductionEfficiency({ startDate, endDate, companyId, productionLineId });
      
      // Get quality metrics
      const qualityMetrics = await this.getQualityMetrics({ startDate, endDate, companyId, productionLineId });
      
      // Get equipment utilization
      const equipmentUtilization = await this.getEquipmentUtilization({ startDate, endDate, companyId, productionLineId });
      
      // Get production schedule
      const productionSchedule = await this.getProductionSchedule({ companyId, productionLineId });

      return {
        productionKPIs,
        productionEfficiency,
        qualityMetrics,
        equipmentUtilization,
        productionSchedule,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting production dashboard:', error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard updates
   */
  async getRealTimeUpdates({ dashboardType, companyId, userId }) {
    try {
      const updates = {};

      switch (dashboardType) {
        case 'executive':
          updates.newOrders = await this.getNewOrdersCount({ companyId });
          updates.alerts = await this.getActiveAlerts({ companyId });
          break;
        case 'sales':
          updates.recentSales = await this.getRecentSales({ companyId });
          updates.pipelineChanges = await this.getPipelineChanges({ companyId });
          break;
        case 'inventory':
          updates.stockMovements = await this.getRecentStockMovements({ companyId });
          updates.newAlerts = await this.getNewInventoryAlerts({ companyId });
          break;
        case 'financial':
          updates.cashPosition = await this.getCurrentCashPosition({ companyId });
          updates.overdueInvoices = await this.getOverdueInvoices({ companyId });
          break;
        case 'production':
          updates.productionStatus = await this.getCurrentProductionStatus({ companyId });
          updates.equipmentAlerts = await this.getEquipmentAlerts({ companyId });
          break;
      }

      return updates;

    } catch (error) {
      logger.error('Error getting real-time updates:', error);
      throw error;
    }
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig({ dashboardType, userId }) {
    try {
      const { data, error } = await this.db
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('dashboard_type', dashboardType)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || this.getDefaultDashboardConfig(dashboardType);

    } catch (error) {
      logger.error('Error getting dashboard config:', error);
      throw error;
    }
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboardConfig({ dashboardType, configuration, userId }) {
    try {
      const { data, error } = await this.db
        .from('dashboard_configs')
        .upsert({
          user_id: userId,
          dashboard_type: dashboardType,
          configuration: configuration,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error updating dashboard config:', error);
      throw error;
    }
  }

  // Private helper methods
  parseDateRange(dateRange) {
    const today = moment();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = today.clone().startOf('day');
        endDate = today.clone().endOf('day');
        break;
      case 'yesterday':
        startDate = today.clone().subtract(1, 'day').startOf('day');
        endDate = today.clone().subtract(1, 'day').endOf('day');
        break;
      case 'week':
        startDate = today.clone().startOf('week');
        endDate = today.clone().endOf('week');
        break;
      case 'month':
        startDate = today.clone().startOf('month');
        endDate = today.clone().endOf('month');
        break;
      case 'quarter':
        startDate = today.clone().startOf('quarter');
        endDate = today.clone().endOf('quarter');
        break;
      case 'year':
        startDate = today.clone().startOf('year');
        endDate = today.clone().endOf('year');
        break;
      default:
        // Custom date range
        if (dateRange && dateRange.includes(' to ')) {
          const [start, end] = dateRange.split(' to ');
          startDate = moment(start);
          endDate = moment(end);
        } else {
          startDate = today.clone().startOf('month');
          endDate = today.clone().endOf('month');
        }
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  getDefaultDashboardConfig(dashboardType) {
    const configs = {
      executive: {
        widgets: ['kpis', 'revenue-trend', 'top-products', 'customer-metrics'],
        layout: 'grid',
        refreshInterval: 300000 // 5 minutes
      },
      sales: {
        widgets: ['sales-kpis', 'sales-trend', 'pipeline', 'team-performance'],
        layout: 'grid',
        refreshInterval: 180000 // 3 minutes
      },
      inventory: {
        widgets: ['inventory-kpis', 'stock-levels', 'movements', 'alerts'],
        layout: 'grid',
        refreshInterval: 120000 // 2 minutes
      },
      financial: {
        widgets: ['financial-kpis', 'cash-flow', 'profit-loss', 'receivables'],
        layout: 'grid',
        refreshInterval: 600000 // 10 minutes
      },
      production: {
        widgets: ['production-kpis', 'efficiency', 'quality', 'utilization'],
        layout: 'grid',
        refreshInterval: 60000 // 1 minute
      }
    };

    return configs[dashboardType] || configs.executive;
  }

  // KPI calculation methods would be implemented here
  async getExecutiveKPIs({ startDate, endDate, companyId }) {
    // Implementation for executive KPIs
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      customerGrowth: 0,
      profitMargin: 0
    };
  }

  async getSalesKPIs({ startDate, endDate, companyId, salesTeam }) {
    // Implementation for sales KPIs
    return {
      totalSales: 0,
      salesGrowth: 0,
      conversionRate: 0,
      averageDealSize: 0,
      salesCycle: 0
    };
  }

  async getInventoryKPIs({ startDate, endDate, companyId, warehouseId }) {
    // Implementation for inventory KPIs
    return {
      totalValue: 0,
      turnoverRate: 0,
      stockoutRate: 0,
      carryingCost: 0,
      accuracy: 0
    };
  }

  async getFinancialKPIs({ startDate, endDate, companyId }) {
    // Implementation for financial KPIs
    return {
      grossRevenue: 0,
      netProfit: 0,
      cashFlow: 0,
      dso: 0, // Days Sales Outstanding
      dpo: 0  // Days Payable Outstanding
    };
  }

  async getProductionKPIs({ startDate, endDate, companyId, productionLineId }) {
    // Implementation for production KPIs
    return {
      totalProduction: 0,
      efficiency: 0,
      qualityRate: 0,
      downtime: 0,
      oee: 0 // Overall Equipment Effectiveness
    };
  }

  // Additional methods for data retrieval would be implemented here
  async getRevenueTrend({ startDate, endDate, companyId }) {
    // Implementation for revenue trend data
    return [];
  }

  async getTopProducts({ startDate, endDate, companyId }) {
    // Implementation for top products data
    return [];
  }

  async getCustomerMetrics({ startDate, endDate, companyId }) {
    // Implementation for customer metrics
    return {};
  }

  async getInventoryAlerts({ companyId }) {
    // Implementation for inventory alerts
    return [];
  }

  async getFinancialSummary({ startDate, endDate, companyId }) {
    // Implementation for financial summary
    return {};
  }
}

module.exports = { DashboardService };