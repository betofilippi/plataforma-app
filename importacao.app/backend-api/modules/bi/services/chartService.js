/**
 * Chart Service
 * Handles Chart.js configuration and data formatting for visualizations
 */

const logger = require('../../../utils/logger');
const moment = require('moment');

class ChartService {
  constructor() {
    this.defaultColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];
  }

  /**
   * Create line chart configuration
   */
  createLineChart({ data, labels, title, datasets, options = {} }) {
    try {
      return {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor || this.defaultColors[index],
            backgroundColor: dataset.backgroundColor || this.hexToRgba(this.defaultColors[index], 0.1),
            fill: dataset.fill !== undefined ? dataset.fill : false,
            tension: dataset.tension || 0.4,
            pointRadius: dataset.pointRadius || 3,
            pointHoverRadius: dataset.pointHoverRadius || 6,
            borderWidth: dataset.borderWidth || 2
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: options.xAxisLabel || 'Time'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: options.yAxisLabel || 'Value'
              },
              beginAtZero: options.beginAtZero !== undefined ? options.beginAtZero : true
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating line chart:', error);
      throw error;
    }
  }

  /**
   * Create bar chart configuration
   */
  createBarChart({ data, labels, title, datasets, options = {} }) {
    try {
      return {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: dataset.backgroundColor || this.hexToRgba(this.defaultColors[index], 0.8),
            borderColor: dataset.borderColor || this.defaultColors[index],
            borderWidth: dataset.borderWidth || 1,
            borderRadius: dataset.borderRadius || 4,
            borderSkipped: false
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: datasets.length > 1,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: options.xAxisLabel || 'Category'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: options.yAxisLabel || 'Value'
              },
              beginAtZero: true
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating bar chart:', error);
      throw error;
    }
  }

  /**
   * Create pie chart configuration
   */
  createPieChart({ data, labels, title, options = {} }) {
    try {
      return {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: this.defaultColors.slice(0, data.length),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                  const percentage = ((context.parsed * 100) / total).toFixed(1);
                  return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating pie chart:', error);
      throw error;
    }
  }

  /**
   * Create doughnut chart configuration
   */
  createDoughnutChart({ data, labels, title, options = {} }) {
    try {
      return {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: this.defaultColors.slice(0, data.length),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                  const percentage = ((context.parsed * 100) / total).toFixed(1);
                  return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          },
          cutout: '60%',
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating doughnut chart:', error);
      throw error;
    }
  }

  /**
   * Create area chart configuration
   */
  createAreaChart({ data, labels, title, datasets, options = {} }) {
    try {
      return {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor || this.defaultColors[index],
            backgroundColor: dataset.backgroundColor || this.hexToRgba(this.defaultColors[index], 0.3),
            fill: dataset.fill !== undefined ? dataset.fill : true,
            tension: dataset.tension || 0.4,
            pointRadius: dataset.pointRadius || 3,
            pointHoverRadius: dataset.pointHoverRadius || 6,
            borderWidth: dataset.borderWidth || 2
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: options.xAxisLabel || 'Time'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: options.yAxisLabel || 'Value'
              },
              beginAtZero: true,
              stacked: options.stacked || false
            }
          },
          elements: {
            line: {
              fill: true
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating area chart:', error);
      throw error;
    }
  }

  /**
   * Create scatter plot configuration
   */
  createScatterChart({ data, title, datasets, options = {} }) {
    try {
      return {
        type: 'scatter',
        data: {
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: dataset.backgroundColor || this.hexToRgba(this.defaultColors[index], 0.6),
            borderColor: dataset.borderColor || this.defaultColors[index],
            borderWidth: dataset.borderWidth || 1,
            pointRadius: dataset.pointRadius || 5,
            pointHoverRadius: dataset.pointHoverRadius || 7
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: datasets.length > 1,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: (${context.parsed.x}, ${context.parsed.y})`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: options.xAxisLabel || 'X-Axis'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: options.yAxisLabel || 'Y-Axis'
              }
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating scatter chart:', error);
      throw error;
    }
  }

  /**
   * Create radar chart configuration
   */
  createRadarChart({ data, labels, title, datasets, options = {} }) {
    try {
      return {
        type: 'radar',
        data: {
          labels: labels,
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor || this.defaultColors[index],
            backgroundColor: dataset.backgroundColor || this.hexToRgba(this.defaultColors[index], 0.2),
            borderWidth: dataset.borderWidth || 2,
            pointRadius: dataset.pointRadius || 3,
            pointHoverRadius: dataset.pointHoverRadius || 6
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: options.maxValue || 100
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating radar chart:', error);
      throw error;
    }
  }

  /**
   * Create gauge chart configuration
   */
  createGaugeChart({ value, min = 0, max = 100, title, thresholds = [], options = {} }) {
    try {
      // Calculate percentage
      const percentage = ((value - min) / (max - min)) * 100;
      
      // Create gauge segments
      const segments = [];
      if (thresholds.length > 0) {
        thresholds.forEach((threshold, index) => {
          segments.push({
            value: threshold.value,
            color: threshold.color || this.defaultColors[index],
            label: threshold.label
          });
        });
      } else {
        // Default segments
        segments.push(
          { value: 30, color: '#FF6384', label: 'Low' },
          { value: 70, color: '#FFCE56', label: 'Medium' },
          { value: 100, color: '#36A2EB', label: 'High' }
        );
      }

      return {
        type: 'doughnut',
        data: {
          labels: segments.map(s => s.label),
          datasets: [{
            data: segments.map(s => s.value),
            backgroundColor: segments.map(s => s.color),
            borderWidth: 0,
            cutout: '80%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          },
          rotation: -90,
          circumference: 180,
          elements: {
            center: {
              text: `${value}${options.unit || ''}`,
              color: '#333',
              fontStyle: 'Arial',
              sidePadding: 20,
              minFontSize: 20,
              lineHeight: 25
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating gauge chart:', error);
      throw error;
    }
  }

  /**
   * Create KPI card configuration
   */
  createKPICard({ title, value, previousValue, unit = '', trend = 'neutral', target = null, options = {} }) {
    try {
      // Calculate change
      let change = 0;
      let changePercentage = 0;
      
      if (previousValue !== null && previousValue !== undefined) {
        change = value - previousValue;
        changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
      }

      // Determine trend color
      let trendColor = '#6c757d'; // neutral
      if (trend === 'up' || changePercentage > 0) {
        trendColor = '#28a745'; // green
      } else if (trend === 'down' || changePercentage < 0) {
        trendColor = '#dc3545'; // red
      }

      return {
        type: 'kpi',
        data: {
          title,
          value,
          formattedValue: this.formatValue(value, unit),
          previousValue,
          change,
          changePercentage: Math.abs(changePercentage),
          trend,
          trendColor,
          target,
          targetPercentage: target ? ((value / target) * 100) : null,
          unit
        },
        options: {
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating KPI card:', error);
      throw error;
    }
  }

  /**
   * Create heatmap configuration
   */
  createHeatmap({ data, xLabels, yLabels, title, options = {} }) {
    try {
      return {
        type: 'heatmap',
        data: {
          labels: xLabels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: function(context) {
              const value = context.parsed.v;
              const opacity = value / Math.max(...data.map(d => d.v));
              return `rgba(54, 162, 235, ${opacity})`;
            },
            borderColor: '#fff',
            borderWidth: 1,
            width: '{width}',
            height: '{height}'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(context) {
                  return `${yLabels[context[0].dataIndex]}: ${context[0].label}`;
                },
                label: function(context) {
                  return `Value: ${context.parsed.v}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              title: {
                display: true,
                text: options.xAxisLabel || 'X-Axis'
              }
            },
            y: {
              type: 'linear',
              title: {
                display: true,
                text: options.yAxisLabel || 'Y-Axis'
              }
            }
          },
          ...options
        }
      };
    } catch (error) {
      logger.error('Error creating heatmap:', error);
      throw error;
    }
  }

  /**
   * Generate chart configuration for dashboard widgets
   */
  generateDashboardCharts(dashboardData) {
    try {
      const charts = [];

      // Revenue trend chart
      if (dashboardData.revenueTrend) {
        charts.push(this.createLineChart({
          data: dashboardData.revenueTrend.data,
          labels: dashboardData.revenueTrend.labels,
          title: 'Revenue Trend',
          datasets: [{
            label: 'Revenue',
            data: dashboardData.revenueTrend.data,
            borderColor: '#36A2EB',
            backgroundColor: this.hexToRgba('#36A2EB', 0.1)
          }],
          options: {
            yAxisLabel: 'Revenue ($)',
            xAxisLabel: 'Period'
          }
        }));
      }

      // Sales by product chart
      if (dashboardData.salesByProduct) {
        charts.push(this.createBarChart({
          data: dashboardData.salesByProduct.data,
          labels: dashboardData.salesByProduct.labels,
          title: 'Sales by Product',
          datasets: [{
            label: 'Sales',
            data: dashboardData.salesByProduct.data
          }],
          options: {
            yAxisLabel: 'Sales ($)',
            xAxisLabel: 'Products'
          }
        }));
      }

      // Customer distribution chart
      if (dashboardData.customerDistribution) {
        charts.push(this.createPieChart({
          data: dashboardData.customerDistribution.data,
          labels: dashboardData.customerDistribution.labels,
          title: 'Customer Distribution'
        }));
      }

      // KPI cards
      if (dashboardData.kpis) {
        dashboardData.kpis.forEach(kpi => {
          charts.push(this.createKPICard({
            title: kpi.title,
            value: kpi.value,
            previousValue: kpi.previousValue,
            unit: kpi.unit,
            trend: kpi.trend,
            target: kpi.target
          }));
        });
      }

      return charts;

    } catch (error) {
      logger.error('Error generating dashboard charts:', error);
      throw error;
    }
  }

  /**
   * Helper method to convert hex color to rgba
   */
  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Helper method to format values
   */
  formatValue(value, unit = '') {
    if (value === null || value === undefined) return 'N/A';
    
    let formattedValue = value;
    
    if (typeof value === 'number') {
      if (Math.abs(value) >= 1000000) {
        formattedValue = (value / 1000000).toFixed(1) + 'M';
      } else if (Math.abs(value) >= 1000) {
        formattedValue = (value / 1000).toFixed(1) + 'K';
      } else {
        formattedValue = value.toLocaleString();
      }
    }
    
    return `${formattedValue}${unit}`;
  }

  /**
   * Helper method to generate time series labels
   */
  generateTimeSeriesLabels(startDate, endDate, granularity = 'daily') {
    const labels = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      switch (granularity) {
        case 'hourly':
          labels.push(current.format('HH:mm'));
          current.add(1, 'hour');
          break;
        case 'daily':
          labels.push(current.format('MMM DD'));
          current.add(1, 'day');
          break;
        case 'weekly':
          labels.push(current.format('MMM DD'));
          current.add(1, 'week');
          break;
        case 'monthly':
          labels.push(current.format('MMM YYYY'));
          current.add(1, 'month');
          break;
        case 'quarterly':
          labels.push(`Q${current.quarter()} ${current.year()}`);
          current.add(1, 'quarter');
          break;
        case 'yearly':
          labels.push(current.format('YYYY'));
          current.add(1, 'year');
          break;
        default:
          labels.push(current.format('MMM DD'));
          current.add(1, 'day');
      }
    }

    return labels;
  }

  /**
   * Helper method to get responsive chart options
   */
  getResponsiveOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 6,
          padding: 10
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };
  }
}

module.exports = { ChartService };