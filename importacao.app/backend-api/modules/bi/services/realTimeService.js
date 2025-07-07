/**
 * Real-Time Service
 * Handles real-time data updates using WebSocket/Socket.io
 */

const { Server } = require('socket.io');
const { supabase } = require('../../../src/config/database');
const logger = require('../../../utils/logger');
const { DashboardService } = require('./dashboardService');

class RealTimeService {
  constructor() {
    this.io = null;
    this.dashboardService = new DashboardService();
    this.activeConnections = new Map();
    this.updateIntervals = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Initialize Socket.io server
   */
  initialize(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      this.setupSocketHandlers();
      this.setupDatabaseListeners();
      
      logger.info('Real-time service initialized successfully');
    } catch (error) {
      logger.error('Error initializing real-time service:', error);
      throw error;
    }
  }

  /**
   * Setup Socket.io event handlers
   */
  setupSocketHandlers() {
    try {
      this.io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Handle authentication
        socket.on('authenticate', (data) => {
          this.handleAuthentication(socket, data);
        });

        // Handle dashboard subscription
        socket.on('subscribe_dashboard', (data) => {
          this.handleDashboardSubscription(socket, data);
        });

        // Handle dashboard unsubscription
        socket.on('unsubscribe_dashboard', (data) => {
          this.handleDashboardUnsubscription(socket, data);
        });

        // Handle KPI subscription
        socket.on('subscribe_kpi', (data) => {
          this.handleKPISubscription(socket, data);
        });

        // Handle chart data subscription
        socket.on('subscribe_chart', (data) => {
          this.handleChartSubscription(socket, data);
        });

        // Handle real-time analytics
        socket.on('subscribe_analytics', (data) => {
          this.handleAnalyticsSubscription(socket, data);
        });

        // Handle alerts subscription
        socket.on('subscribe_alerts', (data) => {
          this.handleAlertsSubscription(socket, data);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
          this.handleDisconnect(socket);
        });

        // Handle error
        socket.on('error', (error) => {
          logger.error(`Socket error for ${socket.id}:`, error);
        });
      });

    } catch (error) {
      logger.error('Error setting up socket handlers:', error);
      throw error;
    }
  }

  /**
   * Setup database change listeners
   */
  setupDatabaseListeners() {
    try {
      // Listen for changes in various tables
      this.setupTableListener('sales_orders', 'sales');
      this.setupTableListener('inventory_movements', 'inventory');
      this.setupTableListener('financial_transactions', 'financial');
      this.setupTableListener('production_orders', 'production');
      this.setupTableListener('customer_interactions', 'customers');
      this.setupTableListener('supplier_transactions', 'suppliers');
      this.setupTableListener('system_alerts', 'alerts');

    } catch (error) {
      logger.error('Error setting up database listeners:', error);
      throw error;
    }
  }

  /**
   * Setup table change listener
   */
  setupTableListener(tableName, eventType) {
    try {
      const subscription = supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            this.handleDatabaseChange(eventType, payload);
          }
        )
        .subscribe();

      this.subscriptions.set(tableName, subscription);
      logger.info(`Database listener setup for table: ${tableName}`);

    } catch (error) {
      logger.error(`Error setting up listener for table ${tableName}:`, error);
    }
  }

  /**
   * Handle database changes
   */
  handleDatabaseChange(eventType, payload) {
    try {
      logger.debug(`Database change detected: ${eventType}`, payload);

      // Broadcast to relevant dashboard subscribers
      this.broadcastDashboardUpdate(eventType, payload);

      // Update KPIs if necessary
      this.updateKPIs(eventType, payload);

      // Trigger alerts if needed
      this.checkAndTriggerAlerts(eventType, payload);

    } catch (error) {
      logger.error('Error handling database change:', error);
    }
  }

  /**
   * Handle client authentication
   */
  handleAuthentication(socket, data) {
    try {
      const { token, userId, companyId } = data;

      // Validate token (implement your JWT validation logic)
      if (this.validateToken(token)) {
        socket.userId = userId;
        socket.companyId = companyId;
        socket.authenticated = true;

        this.activeConnections.set(socket.id, {
          userId,
          companyId,
          socket,
          connectedAt: new Date()
        });

        socket.emit('authentication_success', {
          message: 'Authentication successful',
          userId,
          companyId
        });

        logger.info(`Client authenticated: ${socket.id} (User: ${userId})`);
      } else {
        socket.emit('authentication_error', { message: 'Invalid token' });
        socket.disconnect();
      }

    } catch (error) {
      logger.error('Error handling authentication:', error);
      socket.emit('authentication_error', { message: 'Authentication failed' });
    }
  }

  /**
   * Handle dashboard subscription
   */
  handleDashboardSubscription(socket, data) {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { dashboardType, refreshInterval = 30000 } = data;

      // Join dashboard room
      socket.join(`dashboard_${dashboardType}_${socket.companyId}`);

      // Store subscription
      if (!socket.subscriptions) {
        socket.subscriptions = new Map();
      }
      socket.subscriptions.set(`dashboard_${dashboardType}`, { refreshInterval });

      // Start periodic updates
      this.startPeriodicUpdates(socket, dashboardType, refreshInterval);

      socket.emit('dashboard_subscription_success', {
        dashboardType,
        refreshInterval
      });

      logger.info(`Dashboard subscription: ${socket.id} -> ${dashboardType}`);

    } catch (error) {
      logger.error('Error handling dashboard subscription:', error);
      socket.emit('error', { message: 'Dashboard subscription failed' });
    }
  }

  /**
   * Handle dashboard unsubscription
   */
  handleDashboardUnsubscription(socket, data) {
    try {
      const { dashboardType } = data;

      // Leave dashboard room
      socket.leave(`dashboard_${dashboardType}_${socket.companyId}`);

      // Remove subscription
      if (socket.subscriptions) {
        socket.subscriptions.delete(`dashboard_${dashboardType}`);
      }

      // Stop periodic updates
      this.stopPeriodicUpdates(socket, dashboardType);

      socket.emit('dashboard_unsubscription_success', { dashboardType });

      logger.info(`Dashboard unsubscription: ${socket.id} -> ${dashboardType}`);

    } catch (error) {
      logger.error('Error handling dashboard unsubscription:', error);
    }
  }

  /**
   * Handle KPI subscription
   */
  handleKPISubscription(socket, data) {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { kpiType, refreshInterval = 60000 } = data;

      // Join KPI room
      socket.join(`kpi_${kpiType}_${socket.companyId}`);

      // Start KPI updates
      this.startKPIUpdates(socket, kpiType, refreshInterval);

      socket.emit('kpi_subscription_success', { kpiType, refreshInterval });

    } catch (error) {
      logger.error('Error handling KPI subscription:', error);
      socket.emit('error', { message: 'KPI subscription failed' });
    }
  }

  /**
   * Handle chart subscription
   */
  handleChartSubscription(socket, data) {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { chartType, parameters, refreshInterval = 120000 } = data;

      // Join chart room
      socket.join(`chart_${chartType}_${socket.companyId}`);

      // Start chart updates
      this.startChartUpdates(socket, chartType, parameters, refreshInterval);

      socket.emit('chart_subscription_success', { chartType, refreshInterval });

    } catch (error) {
      logger.error('Error handling chart subscription:', error);
      socket.emit('error', { message: 'Chart subscription failed' });
    }
  }

  /**
   * Handle analytics subscription
   */
  handleAnalyticsSubscription(socket, data) {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { analyticsType, parameters, refreshInterval = 300000 } = data;

      // Join analytics room
      socket.join(`analytics_${analyticsType}_${socket.companyId}`);

      // Start analytics updates
      this.startAnalyticsUpdates(socket, analyticsType, parameters, refreshInterval);

      socket.emit('analytics_subscription_success', { analyticsType, refreshInterval });

    } catch (error) {
      logger.error('Error handling analytics subscription:', error);
      socket.emit('error', { message: 'Analytics subscription failed' });
    }
  }

  /**
   * Handle alerts subscription
   */
  handleAlertsSubscription(socket, data) {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { alertTypes = [] } = data;

      // Join alerts room
      socket.join(`alerts_${socket.companyId}`);

      // Store alert preferences
      socket.alertTypes = alertTypes;

      socket.emit('alerts_subscription_success', { alertTypes });

    } catch (error) {
      logger.error('Error handling alerts subscription:', error);
      socket.emit('error', { message: 'Alerts subscription failed' });
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket) {
    try {
      logger.info(`Client disconnected: ${socket.id}`);

      // Clean up active connections
      this.activeConnections.delete(socket.id);

      // Clean up update intervals
      this.cleanupSocketIntervals(socket);

      // Clean up subscriptions
      if (socket.subscriptions) {
        socket.subscriptions.clear();
      }

    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Start periodic dashboard updates
   */
  startPeriodicUpdates(socket, dashboardType, refreshInterval) {
    try {
      const intervalKey = `${socket.id}_${dashboardType}`;
      
      // Clear existing interval
      if (this.updateIntervals.has(intervalKey)) {
        clearInterval(this.updateIntervals.get(intervalKey));
      }

      // Set new interval
      const interval = setInterval(async () => {
        try {
          const updates = await this.getDashboardUpdates(dashboardType, socket.companyId);
          socket.emit('dashboard_update', { dashboardType, updates });
        } catch (error) {
          logger.error(`Error sending dashboard update to ${socket.id}:`, error);
        }
      }, refreshInterval);

      this.updateIntervals.set(intervalKey, interval);

    } catch (error) {
      logger.error('Error starting periodic updates:', error);
    }
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(socket, dashboardType) {
    try {
      const intervalKey = `${socket.id}_${dashboardType}`;
      
      if (this.updateIntervals.has(intervalKey)) {
        clearInterval(this.updateIntervals.get(intervalKey));
        this.updateIntervals.delete(intervalKey);
      }

    } catch (error) {
      logger.error('Error stopping periodic updates:', error);
    }
  }

  /**
   * Start KPI updates
   */
  startKPIUpdates(socket, kpiType, refreshInterval) {
    try {
      const intervalKey = `${socket.id}_kpi_${kpiType}`;
      
      const interval = setInterval(async () => {
        try {
          const kpiData = await this.getKPIData(kpiType, socket.companyId);
          socket.emit('kpi_update', { kpiType, data: kpiData });
        } catch (error) {
          logger.error(`Error sending KPI update to ${socket.id}:`, error);
        }
      }, refreshInterval);

      this.updateIntervals.set(intervalKey, interval);

    } catch (error) {
      logger.error('Error starting KPI updates:', error);
    }
  }

  /**
   * Start chart updates
   */
  startChartUpdates(socket, chartType, parameters, refreshInterval) {
    try {
      const intervalKey = `${socket.id}_chart_${chartType}`;
      
      const interval = setInterval(async () => {
        try {
          const chartData = await this.getChartData(chartType, parameters, socket.companyId);
          socket.emit('chart_update', { chartType, data: chartData });
        } catch (error) {
          logger.error(`Error sending chart update to ${socket.id}:`, error);
        }
      }, refreshInterval);

      this.updateIntervals.set(intervalKey, interval);

    } catch (error) {
      logger.error('Error starting chart updates:', error);
    }
  }

  /**
   * Start analytics updates
   */
  startAnalyticsUpdates(socket, analyticsType, parameters, refreshInterval) {
    try {
      const intervalKey = `${socket.id}_analytics_${analyticsType}`;
      
      const interval = setInterval(async () => {
        try {
          const analyticsData = await this.getAnalyticsData(analyticsType, parameters, socket.companyId);
          socket.emit('analytics_update', { analyticsType, data: analyticsData });
        } catch (error) {
          logger.error(`Error sending analytics update to ${socket.id}:`, error);
        }
      }, refreshInterval);

      this.updateIntervals.set(intervalKey, interval);

    } catch (error) {
      logger.error('Error starting analytics updates:', error);
    }
  }

  /**
   * Broadcast dashboard update
   */
  broadcastDashboardUpdate(eventType, payload) {
    try {
      // Determine which dashboards need updates
      const dashboardTypes = this.getDashboardTypesForEvent(eventType);
      
      dashboardTypes.forEach(dashboardType => {
        this.io.to(`dashboard_${dashboardType}_${payload.companyId}`).emit('dashboard_change', {
          eventType,
          dashboardType,
          change: payload
        });
      });

    } catch (error) {
      logger.error('Error broadcasting dashboard update:', error);
    }
  }

  /**
   * Update KPIs
   */
  updateKPIs(eventType, payload) {
    try {
      // Determine which KPIs need updates
      const kpiTypes = this.getKPITypesForEvent(eventType);
      
      kpiTypes.forEach(kpiType => {
        this.io.to(`kpi_${kpiType}_${payload.companyId}`).emit('kpi_change', {
          eventType,
          kpiType,
          change: payload
        });
      });

    } catch (error) {
      logger.error('Error updating KPIs:', error);
    }
  }

  /**
   * Check and trigger alerts
   */
  checkAndTriggerAlerts(eventType, payload) {
    try {
      // Implement alert logic based on event type and payload
      const alerts = this.generateAlerts(eventType, payload);
      
      if (alerts.length > 0) {
        this.io.to(`alerts_${payload.companyId}`).emit('new_alerts', alerts);
      }

    } catch (error) {
      logger.error('Error checking and triggering alerts:', error);
    }
  }

  /**
   * Clean up socket intervals
   */
  cleanupSocketIntervals(socket) {
    try {
      const socketIntervals = Array.from(this.updateIntervals.keys())
        .filter(key => key.startsWith(socket.id));

      socketIntervals.forEach(key => {
        clearInterval(this.updateIntervals.get(key));
        this.updateIntervals.delete(key);
      });

    } catch (error) {
      logger.error('Error cleaning up socket intervals:', error);
    }
  }

  /**
   * Get dashboard updates
   */
  async getDashboardUpdates(dashboardType, companyId) {
    try {
      return await this.dashboardService.getRealTimeUpdates({
        dashboardType,
        companyId
      });
    } catch (error) {
      logger.error('Error getting dashboard updates:', error);
      return {};
    }
  }

  /**
   * Get KPI data
   */
  async getKPIData(kpiType, companyId) {
    try {
      // Implement KPI data retrieval logic
      return {};
    } catch (error) {
      logger.error('Error getting KPI data:', error);
      return {};
    }
  }

  /**
   * Get chart data
   */
  async getChartData(chartType, parameters, companyId) {
    try {
      // Implement chart data retrieval logic
      return {};
    } catch (error) {
      logger.error('Error getting chart data:', error);
      return {};
    }
  }

  /**
   * Get analytics data
   */
  async getAnalyticsData(analyticsType, parameters, companyId) {
    try {
      // Implement analytics data retrieval logic
      return {};
    } catch (error) {
      logger.error('Error getting analytics data:', error);
      return {};
    }
  }

  /**
   * Helper methods
   */
  validateToken(token) {
    // Implement JWT token validation
    return true; // Placeholder
  }

  getDashboardTypesForEvent(eventType) {
    const mapping = {
      'sales': ['executive', 'sales'],
      'inventory': ['executive', 'inventory'],
      'financial': ['executive', 'financial'],
      'production': ['executive', 'production'],
      'customers': ['executive', 'sales'],
      'suppliers': ['executive', 'inventory']
    };

    return mapping[eventType] || [];
  }

  getKPITypesForEvent(eventType) {
    const mapping = {
      'sales': ['total_sales', 'sales_growth', 'average_order_value'],
      'inventory': ['inventory_value', 'turnover_rate', 'stock_level'],
      'financial': ['revenue', 'profit', 'cash_flow'],
      'production': ['production_volume', 'efficiency', 'quality_rate']
    };

    return mapping[eventType] || [];
  }

  generateAlerts(eventType, payload) {
    // Implement alert generation logic
    return [];
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    try {
      // Clean up all intervals
      this.updateIntervals.forEach(interval => clearInterval(interval));
      this.updateIntervals.clear();

      // Clean up subscriptions
      this.subscriptions.forEach(subscription => subscription.unsubscribe());
      this.subscriptions.clear();

      // Close Socket.io server
      if (this.io) {
        this.io.close();
      }

      logger.info('Real-time service shutdown completed');

    } catch (error) {
      logger.error('Error during real-time service shutdown:', error);
    }
  }
}

module.exports = { RealTimeService };