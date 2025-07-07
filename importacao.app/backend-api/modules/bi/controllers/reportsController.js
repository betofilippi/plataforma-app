/**
 * Reports Controller
 * Handles report generation, export, and scheduling
 */

const { ReportsService } = require('../services/reportsService');
const { validationResult } = require('express-validator');
const logger = require('../../../utils/logger');

class ReportsController {
  constructor() {
    this.reportsService = new ReportsService();
  }

  /**
   * Get list of available reports
   */
  async getAvailableReports(req, res) {
    try {
      const { category, module } = req.query;
      
      const reports = await this.reportsService.getAvailableReports({
        category,
        module,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      logger.error('Error fetching available reports:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate custom report
   */
  async generateReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        reportType,
        dateRange,
        filters,
        groupBy,
        sortBy,
        format,
        companyId
      } = req.body;
      
      const report = await this.reportsService.generateReport({
        reportType,
        dateRange,
        filters,
        groupBy,
        sortBy,
        format,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific report by ID
   */
  async getReport(req, res) {
    try {
      const { id } = req.params;
      
      const report = await this.reportsService.getReport({
        reportId: id,
        userId: req.user.id
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error fetching report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Export report to PDF or Excel
   */
  async exportReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        reportId,
        format,
        includeCharts,
        customization
      } = req.body;
      
      const exportResult = await this.reportsService.exportReport({
        reportId,
        format,
        includeCharts,
        customization,
        userId: req.user.id
      });

      // Set appropriate headers for file download
      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      }

      res.send(exportResult.buffer);

    } catch (error) {
      logger.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Schedule report delivery
   */
  async scheduleReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        reportType,
        schedule,
        recipients,
        format,
        filters,
        companyId
      } = req.body;
      
      const scheduledReport = await this.reportsService.scheduleReport({
        reportType,
        schedule,
        recipients,
        format,
        filters,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: scheduledReport
      });

    } catch (error) {
      logger.error('Error scheduling report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get financial reports
   */
  async getFinancialReports(req, res) {
    try {
      const { type, dateRange, companyId } = req.query;
      
      const reports = await this.reportsService.getFinancialReports({
        type,
        dateRange,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      logger.error('Error fetching financial reports:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get operational reports
   */
  async getOperationalReports(req, res) {
    try {
      const { module, dateRange, companyId } = req.query;
      
      const reports = await this.reportsService.getOperationalReports({
        module,
        dateRange,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      logger.error('Error fetching operational reports:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get compliance reports
   */
  async getComplianceReports(req, res) {
    try {
      const { type, dateRange, companyId } = req.query;
      
      const reports = await this.reportsService.getComplianceReports({
        type,
        dateRange,
        companyId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      logger.error('Error fetching compliance reports:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates(req, res) {
    try {
      const { category } = req.query;
      
      const templates = await this.reportsService.getReportTemplates({
        category,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      logger.error('Error fetching report templates:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create custom report template
   */
  async createReportTemplate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        name,
        description,
        category,
        configuration,
        isPublic
      } = req.body;
      
      const template = await this.reportsService.createReportTemplate({
        name,
        description,
        category,
        configuration,
        isPublic,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      logger.error('Error creating report template:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { ReportsController };