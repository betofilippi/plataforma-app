/**
 * Reports Service
 * Handles report generation, export, and scheduling
 */

const { supabase } = require('../../../src/config/database');
const logger = require('../../../utils/logger');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class ReportsService {
  constructor() {
    this.db = supabase;
    this.initializeScheduledReports();
  }

  /**
   * Get available reports
   */
  async getAvailableReports({ category, module, userId }) {
    try {
      let query = this.db
        .from('report_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      if (module) {
        query = query.eq('module', module);
      }

      const { data, error } = await query.order('name');

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error getting available reports:', error);
      throw error;
    }
  }

  /**
   * Generate report
   */
  async generateReport({ reportType, dateRange, filters, groupBy, sortBy, format, companyId, userId }) {
    try {
      // Get report template
      const template = await this.getReportTemplate(reportType);
      
      if (!template) {
        throw new Error(`Report template not found: ${reportType}`);
      }

      // Generate report data based on template
      const reportData = await this.generateReportData({
        template,
        dateRange,
        filters,
        groupBy,
        sortBy,
        companyId,
        userId
      });

      // Save report to database
      const { data: savedReport, error } = await this.db
        .from('reports')
        .insert({
          user_id: userId,
          company_id: companyId,
          report_type: reportType,
          parameters: {
            dateRange,
            filters,
            groupBy,
            sortBy
          },
          data: reportData,
          format,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return savedReport;

    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get specific report
   */
  async getReport({ reportId, userId }) {
    try {
      const { data, error } = await this.db
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error getting report:', error);
      throw error;
    }
  }

  /**
   * Export report to PDF or Excel
   */
  async exportReport({ reportId, format, includeCharts, customization, userId }) {
    try {
      // Get report data
      const report = await this.getReport({ reportId, userId });
      
      if (!report) {
        throw new Error('Report not found');
      }

      let buffer;
      let filename;

      if (format === 'pdf') {
        buffer = await this.exportToPDF(report, includeCharts, customization);
        filename = `report_${reportId}_${Date.now()}.pdf`;
      } else if (format === 'excel') {
        buffer = await this.exportToExcel(report, customization);
        filename = `report_${reportId}_${Date.now()}.xlsx`;
      } else {
        throw new Error('Unsupported export format');
      }

      return {
        buffer,
        filename,
        mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

    } catch (error) {
      logger.error('Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Schedule report delivery
   */
  async scheduleReport({ reportType, schedule, recipients, format, filters, companyId, userId }) {
    try {
      // Save scheduled report
      const { data, error } = await this.db
        .from('scheduled_reports')
        .insert({
          user_id: userId,
          company_id: companyId,
          report_type: reportType,
          schedule: schedule,
          recipients: recipients,
          format: format,
          filters: filters,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Setup cron job for scheduled report
      this.setupScheduledReport(data);

      return data;

    } catch (error) {
      logger.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Get financial reports
   */
  async getFinancialReports({ type, dateRange, companyId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let reportData = {};

      switch (type) {
        case 'income_statement':
          reportData = await this.generateIncomeStatement({ startDate, endDate, companyId });
          break;
        case 'balance_sheet':
          reportData = await this.generateBalanceSheet({ startDate, endDate, companyId });
          break;
        case 'cash_flow':
          reportData = await this.generateCashFlowStatement({ startDate, endDate, companyId });
          break;
        case 'accounts_receivable':
          reportData = await this.generateAccountsReceivableReport({ startDate, endDate, companyId });
          break;
        case 'accounts_payable':
          reportData = await this.generateAccountsPayableReport({ startDate, endDate, companyId });
          break;
        default:
          throw new Error(`Unsupported financial report type: ${type}`);
      }

      return reportData;

    } catch (error) {
      logger.error('Error getting financial reports:', error);
      throw error;
    }
  }

  /**
   * Get operational reports
   */
  async getOperationalReports({ module, dateRange, companyId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let reportData = {};

      switch (module) {
        case 'sales':
          reportData = await this.generateSalesReport({ startDate, endDate, companyId });
          break;
        case 'inventory':
          reportData = await this.generateInventoryReport({ startDate, endDate, companyId });
          break;
        case 'production':
          reportData = await this.generateProductionReport({ startDate, endDate, companyId });
          break;
        case 'purchasing':
          reportData = await this.generatePurchasingReport({ startDate, endDate, companyId });
          break;
        default:
          throw new Error(`Unsupported operational report module: ${module}`);
      }

      return reportData;

    } catch (error) {
      logger.error('Error getting operational reports:', error);
      throw error;
    }
  }

  /**
   * Get compliance reports
   */
  async getComplianceReports({ type, dateRange, companyId, userId }) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let reportData = {};

      switch (type) {
        case 'tax_report':
          reportData = await this.generateTaxReport({ startDate, endDate, companyId });
          break;
        case 'audit_trail':
          reportData = await this.generateAuditTrail({ startDate, endDate, companyId });
          break;
        case 'regulatory_compliance':
          reportData = await this.generateRegulatoryComplianceReport({ startDate, endDate, companyId });
          break;
        default:
          throw new Error(`Unsupported compliance report type: ${type}`);
      }

      return reportData;

    } catch (error) {
      logger.error('Error getting compliance reports:', error);
      throw error;
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates({ category, userId }) {
    try {
      let query = this.db
        .from('report_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error getting report templates:', error);
      throw error;
    }
  }

  /**
   * Create custom report template
   */
  async createReportTemplate({ name, description, category, configuration, isPublic, userId }) {
    try {
      const { data, error } = await this.db
        .from('report_templates')
        .insert({
          name,
          description,
          category,
          configuration,
          is_public: isPublic,
          created_by: userId,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error creating report template:', error);
      throw error;
    }
  }

  // Private helper methods
  async getReportTemplate(reportType) {
    try {
      const { data, error } = await this.db
        .from('report_templates')
        .select('*')
        .eq('type', reportType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Error getting report template:', error);
      throw error;
    }
  }

  async generateReportData({ template, dateRange, filters, groupBy, sortBy, companyId, userId }) {
    try {
      // This would contain the logic to generate report data based on the template
      // For now, returning a placeholder structure
      return {
        headers: template.configuration.headers || [],
        data: [],
        summary: {},
        metadata: {
          generatedAt: new Date().toISOString(),
          dateRange,
          filters,
          groupBy,
          sortBy
        }
      };

    } catch (error) {
      logger.error('Error generating report data:', error);
      throw error;
    }
  }

  async exportToPDF(report, includeCharts, customization) {
    try {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      
      // Add report content
      doc.fontSize(20).text(report.report_type.toUpperCase(), 50, 50);
      doc.fontSize(12).text(`Generated: ${moment(report.created_at).format('YYYY-MM-DD HH:mm:ss')}`, 50, 80);
      
      // Add report data
      if (report.data && report.data.data) {
        let yPosition = 120;
        
        report.data.data.forEach((row, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          doc.text(`Row ${index + 1}: ${JSON.stringify(row)}`, 50, yPosition);
          yPosition += 20;
        });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        
        doc.on('error', reject);
      });

    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToExcel(report, customization) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add headers
      if (report.data && report.data.headers) {
        worksheet.addRow(report.data.headers);
      }

      // Add data
      if (report.data && report.data.data) {
        report.data.data.forEach(row => {
          worksheet.addRow(Object.values(row));
        });
      }

      // Style the headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      return await workbook.xlsx.writeBuffer();

    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  setupScheduledReport(scheduledReport) {
    try {
      // Parse cron schedule
      const cronExpression = this.parseCronSchedule(scheduledReport.schedule);
      
      // Create cron job
      cron.schedule(cronExpression, async () => {
        try {
          // Generate report
          const report = await this.generateReport({
            reportType: scheduledReport.report_type,
            dateRange: 'last_month', // or based on schedule
            filters: scheduledReport.filters,
            companyId: scheduledReport.company_id,
            userId: scheduledReport.user_id
          });

          // Export report
          const exportResult = await this.exportReport({
            reportId: report.id,
            format: scheduledReport.format,
            userId: scheduledReport.user_id
          });

          // Send to recipients
          await this.sendReportToRecipients({
            recipients: scheduledReport.recipients,
            report: exportResult,
            reportType: scheduledReport.report_type
          });

          logger.info(`Scheduled report ${scheduledReport.id} sent successfully`);

        } catch (error) {
          logger.error(`Error executing scheduled report ${scheduledReport.id}:`, error);
        }
      });

    } catch (error) {
      logger.error('Error setting up scheduled report:', error);
    }
  }

  parseCronSchedule(schedule) {
    // Convert schedule object to cron expression
    const { frequency, time, dayOfWeek, dayOfMonth } = schedule;

    switch (frequency) {
      case 'daily':
        return `0 ${time.minute} ${time.hour} * * *`;
      case 'weekly':
        return `0 ${time.minute} ${time.hour} * * ${dayOfWeek}`;
      case 'monthly':
        return `0 ${time.minute} ${time.hour} ${dayOfMonth} * *`;
      default:
        return '0 0 8 * * *'; // Default: daily at 8 AM
    }
  }

  async sendReportToRecipients({ recipients, report, reportType }) {
    try {
      // Implementation would send email with report attachment
      // This is a placeholder for the actual email sending logic
      logger.info(`Sending report ${reportType} to ${recipients.length} recipients`);
      
    } catch (error) {
      logger.error('Error sending report to recipients:', error);
      throw error;
    }
  }

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
      case 'last_week':
        startDate = today.clone().subtract(1, 'week').startOf('week');
        endDate = today.clone().subtract(1, 'week').endOf('week');
        break;
      case 'last_month':
        startDate = today.clone().subtract(1, 'month').startOf('month');
        endDate = today.clone().subtract(1, 'month').endOf('month');
        break;
      default:
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

  async initializeScheduledReports() {
    try {
      // Load existing scheduled reports and set up cron jobs
      const { data, error } = await this.db
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      data.forEach(scheduledReport => {
        this.setupScheduledReport(scheduledReport);
      });

      logger.info(`Initialized ${data.length} scheduled reports`);

    } catch (error) {
      logger.error('Error initializing scheduled reports:', error);
    }
  }

  // Report generation methods (placeholders)
  async generateIncomeStatement({ startDate, endDate, companyId }) {
    // Implementation for income statement
    return { type: 'income_statement', data: [] };
  }

  async generateBalanceSheet({ startDate, endDate, companyId }) {
    // Implementation for balance sheet
    return { type: 'balance_sheet', data: [] };
  }

  async generateCashFlowStatement({ startDate, endDate, companyId }) {
    // Implementation for cash flow statement
    return { type: 'cash_flow', data: [] };
  }

  async generateAccountsReceivableReport({ startDate, endDate, companyId }) {
    // Implementation for accounts receivable report
    return { type: 'accounts_receivable', data: [] };
  }

  async generateAccountsPayableReport({ startDate, endDate, companyId }) {
    // Implementation for accounts payable report
    return { type: 'accounts_payable', data: [] };
  }

  async generateSalesReport({ startDate, endDate, companyId }) {
    // Implementation for sales report
    return { type: 'sales', data: [] };
  }

  async generateInventoryReport({ startDate, endDate, companyId }) {
    // Implementation for inventory report
    return { type: 'inventory', data: [] };
  }

  async generateProductionReport({ startDate, endDate, companyId }) {
    // Implementation for production report
    return { type: 'production', data: [] };
  }

  async generatePurchasingReport({ startDate, endDate, companyId }) {
    // Implementation for purchasing report
    return { type: 'purchasing', data: [] };
  }

  async generateTaxReport({ startDate, endDate, companyId }) {
    // Implementation for tax report
    return { type: 'tax_report', data: [] };
  }

  async generateAuditTrail({ startDate, endDate, companyId }) {
    // Implementation for audit trail
    return { type: 'audit_trail', data: [] };
  }

  async generateRegulatoryComplianceReport({ startDate, endDate, companyId }) {
    // Implementation for regulatory compliance report
    return { type: 'regulatory_compliance', data: [] };
  }
}

module.exports = { ReportsService };