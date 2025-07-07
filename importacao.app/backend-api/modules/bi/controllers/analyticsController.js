/**
 * Analytics Controller
 * Handles advanced analytics and forecasting
 */

const { AnalyticsService } = require('../services/analyticsService');
const { validationResult } = require('express-validator');
const logger = require('../../../utils/logger');

class AnalyticsController {
  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, productId, salesTeam, region } = req.query;
      
      const analytics = await this.analyticsService.getSalesAnalytics({
        dateRange,
        companyId,
        productId,
        salesTeam,
        region,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching sales analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sales forecasting
   */
  async getSalesForecasting(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { forecastPeriod, companyId, productId, method } = req.query;
      
      const forecast = await this.analyticsService.getSalesForecasting({
        forecastPeriod,
        companyId,
        productId,
        method,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: forecast
      });

    } catch (error) {
      logger.error('Error generating sales forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, warehouseId, categoryId } = req.query;
      
      const analytics = await this.analyticsService.getInventoryAnalytics({
        dateRange,
        companyId,
        warehouseId,
        categoryId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching inventory analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, accountType } = req.query;
      
      const analytics = await this.analyticsService.getFinancialAnalytics({
        dateRange,
        companyId,
        accountType,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching financial analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, customerSegment, region } = req.query;
      
      const analytics = await this.analyticsService.getCustomerAnalytics({
        dateRange,
        companyId,
        customerSegment,
        region,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching customer analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get supplier performance analytics
   */
  async getSupplierAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, supplierId, category } = req.query;
      
      const analytics = await this.analyticsService.getSupplierAnalytics({
        dateRange,
        companyId,
        supplierId,
        category,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching supplier analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get production efficiency analytics
   */
  async getProductionAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { dateRange, companyId, productionLineId, shiftId } = req.query;
      
      const analytics = await this.analyticsService.getProductionAnalytics({
        dateRange,
        companyId,
        productionLineId,
        shiftId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching production analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { metric, dateRange, companyId, granularity } = req.query;
      
      const trends = await this.analyticsService.getTrendAnalysis({
        metric,
        dateRange,
        companyId,
        granularity,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      logger.error('Error fetching trend analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get comparative analysis
   */
  async getComparativeAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { metric, periods, companyId, groupBy } = req.body;
      
      const comparison = await this.analyticsService.getComparativeAnalysis({
        metric,
        periods,
        companyId,
        groupBy,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      logger.error('Error fetching comparative analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { model, parameters, companyId } = req.body;
      
      const predictions = await this.analyticsService.getPredictiveAnalytics({
        model,
        parameters,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: predictions
      });

    } catch (error) {
      logger.error('Error generating predictive analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { AnalyticsController };