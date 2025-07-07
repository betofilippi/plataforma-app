/**
 * Dashboard Controller
 * Handles dashboard data aggregation and KPI calculations
 */

const { DashboardService } = require('../services/dashboardService');
const { validationResult } = require('express-validator');
const logger = require('../../../utils/logger');

class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * Get executive dashboard data
   */
  async getExecutiveDashboard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId } = req.query;
      
      const dashboardData = await this.dashboardService.getExecutiveDashboard({
        dateRange,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching executive dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sales dashboard data
   */
  async getSalesDashboard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, salesTeam } = req.query;
      
      const dashboardData = await this.dashboardService.getSalesDashboard({
        dateRange,
        companyId,
        salesTeam,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching sales dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get inventory dashboard data
   */
  async getInventoryDashboard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, warehouseId } = req.query;
      
      const dashboardData = await this.dashboardService.getInventoryDashboard({
        dateRange,
        companyId,
        warehouseId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching inventory dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId } = req.query;
      
      const dashboardData = await this.dashboardService.getFinancialDashboard({
        dateRange,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching financial dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get production dashboard data
   */
  async getProductionDashboard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, productionLineId } = req.query;
      
      const dashboardData = await this.dashboardService.getProductionDashboard({
        dateRange,
        companyId,
        productionLineId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching production dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get real-time dashboard updates
   */
  async getRealTimeUpdates(req, res) {
    try {
      const { dashboardType, companyId } = req.query;
      
      const updates = await this.dashboardService.getRealTimeUpdates({
        dashboardType,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: updates
      });

    } catch (error) {
      logger.error('Error fetching real-time updates:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(req, res) {
    try {
      const { dashboardType } = req.params;
      
      const config = await this.dashboardService.getDashboardConfig({
        dashboardType,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      logger.error('Error fetching dashboard config:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboardConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dashboardType } = req.params;
      const { configuration } = req.body;
      
      const updatedConfig = await this.dashboardService.updateDashboardConfig({
        dashboardType,
        configuration,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: updatedConfig
      });

    } catch (error) {
      logger.error('Error updating dashboard config:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { DashboardController };