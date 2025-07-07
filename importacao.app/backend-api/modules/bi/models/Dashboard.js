/**
 * Dashboard Model
 * Database model for dashboard configurations and data
 */

const { supabase } = require('../../../src/config/database');

class Dashboard {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.companyId = data.company_id;
    this.dashboardType = data.dashboard_type;
    this.configuration = data.configuration;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create a new dashboard configuration
   */
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('dashboard_configs')
        .insert({
          user_id: data.userId,
          company_id: data.companyId,
          dashboard_type: data.dashboardType,
          configuration: data.configuration,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Dashboard(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find dashboard by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data ? new Dashboard(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find dashboard by user and type
   */
  static async findByUserAndType(userId, dashboardType) {
    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('dashboard_type', dashboardType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? new Dashboard(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all dashboards for a user
   */
  static async findByUser(userId) {
    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(item => new Dashboard(item));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update dashboard configuration
   */
  async update(data) {
    try {
      const { data: result, error } = await supabase
        .from('dashboard_configs')
        .update({
          configuration: data.configuration || this.configuration,
          updated_at: new Date().toISOString()
        })
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
   * Delete dashboard configuration
   */
  async delete() {
    try {
      const { error } = await supabase
        .from('dashboard_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
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
   * Get default dashboard configuration
   */
  static getDefaultConfig(dashboardType) {
    const defaultConfigs = {
      executive: {
        widgets: [
          { type: 'kpi', id: 'total_revenue', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'total_orders', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'average_order_value', position: { x: 6, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'profit_margin', position: { x: 9, y: 0, w: 3, h: 2 } },
          { type: 'chart', id: 'revenue_trend', chartType: 'line', position: { x: 0, y: 2, w: 8, h: 4 } },
          { type: 'chart', id: 'sales_category', chartType: 'doughnut', position: { x: 8, y: 2, w: 4, h: 4 } }
        ],
        layout: 'grid',
        refreshInterval: 300000,
        theme: 'light'
      },
      sales: {
        widgets: [
          { type: 'kpi', id: 'total_sales', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'sales_growth', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'conversion_rate', position: { x: 6, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'average_deal_size', position: { x: 9, y: 0, w: 3, h: 2 } },
          { type: 'chart', id: 'sales_trend', chartType: 'line', position: { x: 0, y: 2, w: 6, h: 4 } },
          { type: 'chart', id: 'sales_pipeline', chartType: 'bar', position: { x: 6, y: 2, w: 6, h: 4 } }
        ],
        layout: 'grid',
        refreshInterval: 180000,
        theme: 'light'
      },
      inventory: {
        widgets: [
          { type: 'kpi', id: 'inventory_value', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'turnover_rate', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'stockout_rate', position: { x: 6, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'carrying_cost', position: { x: 9, y: 0, w: 3, h: 2 } },
          { type: 'chart', id: 'stock_levels', chartType: 'bar', position: { x: 0, y: 2, w: 6, h: 4 } },
          { type: 'chart', id: 'abc_analysis', chartType: 'pie', position: { x: 6, y: 2, w: 6, h: 4 } }
        ],
        layout: 'grid',
        refreshInterval: 120000,
        theme: 'light'
      },
      financial: {
        widgets: [
          { type: 'kpi', id: 'gross_revenue', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'net_profit', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'cash_flow', position: { x: 6, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'operating_margin', position: { x: 9, y: 0, w: 3, h: 2 } },
          { type: 'chart', id: 'cash_flow_trend', chartType: 'line', position: { x: 0, y: 2, w: 6, h: 4 } },
          { type: 'chart', id: 'expense_breakdown', chartType: 'doughnut', position: { x: 6, y: 2, w: 6, h: 4 } }
        ],
        layout: 'grid',
        refreshInterval: 600000,
        theme: 'light'
      },
      production: {
        widgets: [
          { type: 'kpi', id: 'production_volume', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'efficiency', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'quality_rate', position: { x: 6, y: 0, w: 3, h: 2 } },
          { type: 'kpi', id: 'oee', position: { x: 9, y: 0, w: 3, h: 2 } },
          { type: 'chart', id: 'production_trend', chartType: 'line', position: { x: 0, y: 2, w: 6, h: 4 } },
          { type: 'chart', id: 'equipment_utilization', chartType: 'bar', position: { x: 6, y: 2, w: 6, h: 4 } }
        ],
        layout: 'grid',
        refreshInterval: 60000,
        theme: 'light'
      }
    };

    return defaultConfigs[dashboardType] || defaultConfigs.executive;
  }

  /**
   * Validate dashboard configuration
   */
  static validateConfig(configuration) {
    if (!configuration || typeof configuration !== 'object') {
      return { valid: false, errors: ['Configuration must be an object'] };
    }

    const errors = [];

    if (!Array.isArray(configuration.widgets)) {
      errors.push('Widgets must be an array');
    } else {
      configuration.widgets.forEach((widget, index) => {
        if (!widget.type) {
          errors.push(`Widget ${index} must have a type`);
        }
        if (!widget.id) {
          errors.push(`Widget ${index} must have an id`);
        }
        if (!widget.position || typeof widget.position !== 'object') {
          errors.push(`Widget ${index} must have a position object`);
        }
      });
    }

    if (!configuration.layout) {
      errors.push('Layout is required');
    }

    if (configuration.refreshInterval && (typeof configuration.refreshInterval !== 'number' || configuration.refreshInterval < 30000)) {
      errors.push('Refresh interval must be a number >= 30000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      companyId: this.companyId,
      dashboardType: this.dashboardType,
      configuration: this.configuration,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = { Dashboard };