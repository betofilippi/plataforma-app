/**
 * Report Model
 * Database model for reports and report templates
 */

const { supabase } = require('../../../src/config/database');

class Report {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.companyId = data.company_id;
    this.reportType = data.report_type;
    this.name = data.name;
    this.description = data.description;
    this.parameters = data.parameters;
    this.data = data.data;
    this.format = data.format;
    this.status = data.status;
    this.fileUrl = data.file_url;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create a new report
   */
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('reports')
        .insert({
          user_id: data.userId,
          company_id: data.companyId,
          report_type: data.reportType,
          name: data.name,
          description: data.description,
          parameters: data.parameters,
          data: data.data,
          format: data.format,
          status: data.status || 'pending',
          file_url: data.fileUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Report(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find report by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data ? new Report(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find reports by user
   */
  static async findByUser(userId, options = {}) {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId);

      if (options.reportType) {
        query = query.eq('report_type', options.reportType);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(item => new Report(item));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find reports by company
   */
  static async findByCompany(companyId, options = {}) {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('company_id', companyId);

      if (options.reportType) {
        query = query.eq('report_type', options.reportType);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(item => new Report(item));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update report
   */
  async update(data) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.parameters !== undefined) updateData.parameters = data.parameters;
      if (data.data !== undefined) updateData.data = data.data;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;

      const { data: result, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      Object.assign(this, result);
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete report
   */
  async delete() {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      companyId: this.companyId,
      reportType: this.reportType,
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      data: this.data,
      format: this.format,
      status: this.status,
      fileUrl: this.fileUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class ReportTemplate {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.module = data.module;
    this.type = data.type;
    this.configuration = data.configuration;
    this.isPublic = data.is_public;
    this.isActive = data.is_active;
    this.createdBy = data.created_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create a new report template
   */
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('report_templates')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          module: data.module,
          type: data.type,
          configuration: data.configuration,
          is_public: data.isPublic || false,
          is_active: true,
          created_by: data.createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new ReportTemplate(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find template by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        throw error;
      }

      return data ? new ReportTemplate(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find template by type
   */
  static async findByType(type) {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? new ReportTemplate(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all active templates
   */
  static async findAll(options = {}) {
    try {
      let query = supabase
        .from('report_templates')
        .select('*')
        .eq('is_active', true);

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.module) {
        query = query.eq('module', options.module);
      }

      if (options.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(item => new ReportTemplate(item));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update template
   */
  async update(data) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.module !== undefined) updateData.module = data.module;
      if (data.configuration !== undefined) updateData.configuration = data.configuration;
      if (data.isPublic !== undefined) updateData.is_public = data.isPublic;

      const { data: result, error } = await supabase
        .from('report_templates')
        .update(updateData)
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      Object.assign(this, result);
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete template (soft delete)
   */
  async delete() {
    try {
      const { error } = await supabase
        .from('report_templates')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get default report templates
   */
  static getDefaultTemplates() {
    return [
      {
        name: 'Sales Report',
        description: 'Comprehensive sales analysis report',
        category: 'sales',
        module: 'vnd',
        type: 'sales_report',
        configuration: {
          fields: ['date', 'customer', 'product', 'quantity', 'amount'],
          groupBy: ['date', 'customer', 'product'],
          sortBy: 'date',
          charts: ['sales_trend', 'top_customers', 'product_performance'],
          filters: ['date_range', 'customer', 'product', 'sales_team']
        },
        isPublic: true
      },
      {
        name: 'Inventory Report',
        description: 'Inventory levels and movement analysis',
        category: 'inventory',
        module: 'est',
        type: 'inventory_report',
        configuration: {
          fields: ['product', 'sku', 'current_stock', 'reserved', 'available', 'value'],
          groupBy: ['category', 'warehouse'],
          sortBy: 'value',
          charts: ['stock_levels', 'turnover_analysis', 'abc_classification'],
          filters: ['category', 'warehouse', 'stock_status']
        },
        isPublic: true
      },
      {
        name: 'Financial Report',
        description: 'Financial performance and analysis',
        category: 'financial',
        module: 'fin',
        type: 'financial_report',
        configuration: {
          fields: ['account', 'debit', 'credit', 'balance'],
          groupBy: ['account_type', 'period'],
          sortBy: 'balance',
          charts: ['income_statement', 'balance_sheet', 'cash_flow'],
          filters: ['date_range', 'account_type', 'department']
        },
        isPublic: true
      },
      {
        name: 'Production Report',
        description: 'Production efficiency and quality metrics',
        category: 'production',
        module: 'prd',
        type: 'production_report',
        configuration: {
          fields: ['date', 'product', 'planned_quantity', 'actual_quantity', 'efficiency', 'quality_rate'],
          groupBy: ['product', 'production_line', 'shift'],
          sortBy: 'date',
          charts: ['production_trend', 'efficiency_analysis', 'quality_metrics'],
          filters: ['date_range', 'product', 'production_line', 'shift']
        },
        isPublic: true
      },
      {
        name: 'Customer Report',
        description: 'Customer analysis and behavior insights',
        category: 'customers',
        module: 'vnd',
        type: 'customer_report',
        configuration: {
          fields: ['customer', 'total_orders', 'total_amount', 'avg_order_value', 'last_order_date'],
          groupBy: ['customer_segment', 'region'],
          sortBy: 'total_amount',
          charts: ['customer_distribution', 'purchase_behavior', 'retention_analysis'],
          filters: ['customer_segment', 'region', 'activity_period']
        },
        isPublic: true
      }
    ];
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      module: this.module,
      type: this.type,
      configuration: this.configuration,
      isPublic: this.isPublic,
      isActive: this.isActive,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class ScheduledReport {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.companyId = data.company_id;
    this.reportType = data.report_type;
    this.name = data.name;
    this.schedule = data.schedule;
    this.recipients = data.recipients;
    this.format = data.format;
    this.filters = data.filters;
    this.isActive = data.is_active;
    this.lastRun = data.last_run;
    this.nextRun = data.next_run;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create a new scheduled report
   */
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('scheduled_reports')
        .insert({
          user_id: data.userId,
          company_id: data.companyId,
          report_type: data.reportType,
          name: data.name,
          schedule: data.schedule,
          recipients: data.recipients,
          format: data.format,
          filters: data.filters,
          is_active: true,
          next_run: data.nextRun,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new ScheduledReport(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find scheduled report by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data ? new ScheduledReport(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find active scheduled reports
   */
  static async findActive() {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true)
        .order('next_run', { ascending: true });

      if (error) {
        throw error;
      }

      return data.map(item => new ScheduledReport(item));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update scheduled report
   */
  async update(data) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (data.schedule !== undefined) updateData.schedule = data.schedule;
      if (data.recipients !== undefined) updateData.recipients = data.recipients;
      if (data.format !== undefined) updateData.format = data.format;
      if (data.filters !== undefined) updateData.filters = data.filters;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.lastRun !== undefined) updateData.last_run = data.lastRun;
      if (data.nextRun !== undefined) updateData.next_run = data.nextRun;

      const { data: result, error } = await supabase
        .from('scheduled_reports')
        .update(updateData)
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      Object.assign(this, result);
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete scheduled report
   */
  async delete() {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      companyId: this.companyId,
      reportType: this.reportType,
      name: this.name,
      schedule: this.schedule,
      recipients: this.recipients,
      format: this.format,
      filters: this.filters,
      isActive: this.isActive,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = { Report, ReportTemplate, ScheduledReport };