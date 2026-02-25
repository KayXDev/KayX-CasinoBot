// ═══════════════════════════════════════════════════════════════
// ⚡ SISTEMA DE MONITOREO DE RENDIMIENTO INTEGRAL
// ═══════════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import cacheManager from './cacheManager.js';
import memoryManager from './memoryManager.js';

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    // Métricas de comandos
    this.commandMetrics = new Map();
    
    // Métricas del sistema
    this.systemMetrics = {
      startTime: Date.now(),
      commandsExecuted: 0,
      errorsCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      peakMemoryUsage: 0,
      requestsPerMinute: 0,
      slowCommands: 0
    };
    
    // Configuración de alertas
    this.thresholds = {
      responseTime: {
        warning: 2000,    // 2 segundos
        critical: 5000    // 5 segundos
      },
      memory: {
        warning: 200 * 1024 * 1024,  // 200MB
        critical: 300 * 1024 * 1024  // 300MB
      },
      commandsPerMinute: {
        warning: 100,
        critical: 200
      }
    };
    
    // Buffer circular para métricas en tiempo real
    this.realtimeMetrics = {
      responsesTimes: new Array(100).fill(0),
      memoryReadings: new Array(100).fill(0),
      cpuReadings: new Array(100).fill(0),
      index: 0
    };
    
    // Estado del sistema
    this.systemHealth = {
      overall: 'healthy',
      components: {
        memory: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        commands: 'healthy'
      },
      lastHealthCheck: Date.now()
    };
    
    this.setupPerformanceObserver();
    this.startMonitoring();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔍 OBSERVADOR DE RENDIMIENTO
  // ═══════════════════════════════════════════════════════════════
  
  setupPerformanceObserver() {
    // Observar métricas de Node.js
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.recordPerformanceEntry(entry);
        }
      });
    });
    
    obs.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    
    console.log('🔍 Performance observer initialized');
  }
  
  recordPerformanceEntry(entry) {
    // Registrar entrada de rendimiento
    const index = this.realtimeMetrics.index % 100;
    this.realtimeMetrics.responsesTimes[index] = entry.duration;
    this.realtimeMetrics.index++;
    
    // Alertas de rendimiento
    if (entry.duration > this.thresholds.responseTime.critical) {
      this.emit('criticalPerformance', {
        name: entry.name,
        duration: entry.duration,
        threshold: this.thresholds.responseTime.critical
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 MONITOREO DE COMANDOS
  // ═══════════════════════════════════════════════════════════════
  
  startCommandMeasurement(commandName, userId) {
    const measurementId = `${commandName}_${userId}_${Date.now()}`;
    performance.mark(`${measurementId}_start`);
    
    return {
      id: measurementId,
      command: commandName,
      userId: userId,
      startTime: Date.now(),
      
      finish: (success = true, error = null) => {
        this.finishCommandMeasurement(measurementId, commandName, success, error);
      }
    };
  }
  
  finishCommandMeasurement(measurementId, commandName, success, error) {
    try {
      const endMark = `${measurementId}_end`;
      performance.mark(endMark);
      performance.measure(measurementId, `${measurementId}_start`, endMark);
      
      const measure = performance.getEntriesByName(measurementId)[0];
      const duration = measure ? measure.duration : 0;
      
      // Registrar métricas del comando
      this.recordCommandMetrics(commandName, duration, success, error);
      
      // Limpiar marcas de rendimiento
      performance.clearMarks(`${measurementId}_start`);
      performance.clearMarks(endMark);
      performance.clearMeasures(measurementId);
      
    } catch (err) {
      console.error('Error finishing command measurement:', err);
    }
  }
  
  recordCommandMetrics(commandName, duration, success, error) {
    // Inicializar métricas del comando si no existen
    if (!this.commandMetrics.has(commandName)) {
      this.commandMetrics.set(commandName, {
        name: commandName,
        executionCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        successCount: 0,
        errorCount: 0,
        lastExecution: null,
        errors: []
      });
    }
    
    const metrics = this.commandMetrics.get(commandName);
    
    // Actualizar métricas
    metrics.executionCount++;
    metrics.totalTime += duration;
    metrics.averageTime = metrics.totalTime / metrics.executionCount;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.lastExecution = Date.now();
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
      if (error) {
        metrics.errors.push({
          timestamp: Date.now(),
          error: error.message || error,
          stack: error.stack
        });
        
        // Mantener solo los últimos 10 errores
        if (metrics.errors.length > 10) {
          metrics.errors = metrics.errors.slice(-10);
        }
      }
    }
    
    // Actualizar métricas del sistema
    this.systemMetrics.commandsExecuted++;
    this.systemMetrics.totalResponseTime += duration;
    this.systemMetrics.averageResponseTime = this.systemMetrics.totalResponseTime / this.systemMetrics.commandsExecuted;
    
    if (!success) {
      this.systemMetrics.errorsCount++;
    }
    
    // Verificar comando lento
    if (duration > this.thresholds.responseTime.warning) {
      this.systemMetrics.slowCommands++;
      console.warn(`⚠️ Slow command detected: ${commandName} took ${duration.toFixed(2)}ms`);
      
      this.emit('slowCommand', {
        command: commandName,
        duration,
        threshold: this.thresholds.responseTime.warning
      });
    }
  }
  
  getCommandStats(commandName) {
    return this.commandMetrics.get(commandName) || null;
  }
  
  getTopCommands(limit = 10) {
    return Array.from(this.commandMetrics.values())
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, limit);
  }
  
  getSlowestCommands(limit = 10) {
    return Array.from(this.commandMetrics.values())
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🏥 MONITOREO DE SALUD DEL SISTEMA
  // ═══════════════════════════════════════════════════════════════
  
  startMonitoring() {
    // Monitoreo cada 30 segundos
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Reporte detallado cada 5 minutos
    this.reportInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);
    
    console.log('⚡ Performance monitoring started');
  }
  
  async performHealthCheck() {
    const currentTime = Date.now();
    
    try {
      // Verificar memoria
      const memoryStatus = memoryManager.getSystemStatus();
      this.systemHealth.components.memory = memoryStatus.healthy ? 'healthy' : 'degraded';
      
      // Verificar cache
      const cacheStats = cacheManager.getStats();
      const cacheHitRate = (cacheStats.totalHits / (cacheStats.totalHits + cacheStats.totalMisses)) * 100;
      this.systemHealth.components.cache = cacheHitRate > 70 ? 'healthy' : 'degraded';
      
      // Verificar rendimiento de comandos
      const recentCommands = this.getRecentCommandPerformance();
      this.systemHealth.components.commands = recentCommands.avgResponseTime < this.thresholds.responseTime.warning ? 'healthy' : 'degraded';
      
      // Calcular salud general
      const componentStates = Object.values(this.systemHealth.components);
      const healthyCount = componentStates.filter(state => state === 'healthy').length;
      const degradedCount = componentStates.filter(state => state === 'degraded').length;
      
      if (degradedCount === 0) {
        this.systemHealth.overall = 'healthy';
      } else if (degradedCount <= 2) {
        this.systemHealth.overall = 'degraded';
      } else {
        this.systemHealth.overall = 'critical';
      }
      
      this.systemHealth.lastHealthCheck = currentTime;
      
      // Emitir evento si hay cambio de estado
      this.emit('healthCheck', this.systemHealth);
      
      // Alertas de salud
      if (this.systemHealth.overall === 'critical') {
        console.error('🚨 SYSTEM HEALTH CRITICAL:', this.systemHealth);
        this.emit('criticalHealth', this.systemHealth);
      } else if (this.systemHealth.overall === 'degraded') {
        console.warn('⚠️ SYSTEM HEALTH DEGRADED:', this.systemHealth);
        this.emit('degradedHealth', this.systemHealth);
      }
      
    } catch (error) {
      console.error('❌ Error during health check:', error);
      this.systemHealth.overall = 'unknown';
    }
  }
  
  getRecentCommandPerformance() {
    const fiveMinutesAgo = Date.now() - 300000;
    const recentCommands = Array.from(this.commandMetrics.values())
      .filter(cmd => cmd.lastExecution && cmd.lastExecution > fiveMinutesAgo);
    
    if (recentCommands.length === 0) {
      return { avgResponseTime: 0, commandCount: 0 };
    }
    
    const totalTime = recentCommands.reduce((sum, cmd) => sum + cmd.averageTime, 0);
    const totalCommands = recentCommands.reduce((sum, cmd) => sum + cmd.executionCount, 0);
    
    return {
      avgResponseTime: totalTime / recentCommands.length,
      commandCount: totalCommands
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📈 REPORTES Y ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════
  
  generatePerformanceReport() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const memoryUsage = process.memoryUsage();
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptime,
        readable: this.formatUptime(uptime)
      },
      
      systemMetrics: {
        ...this.systemMetrics,
        requestsPerMinute: Math.round((this.systemMetrics.commandsExecuted / (uptime / 60000)) * 100) / 100,
        errorRate: Math.round((this.systemMetrics.errorsCount / this.systemMetrics.commandsExecuted) * 10000) / 100,
        currentMemory: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
        }
      },
      
      systemHealth: this.systemHealth,
      
      topCommands: this.getTopCommands(5),
      slowestCommands: this.getSlowestCommands(5),
      
      realtimeMetrics: {
        avgResponseTime: this.calculateAverage(this.realtimeMetrics.responsesTimes),
        medianResponseTime: this.calculateMedian(this.realtimeMetrics.responsesTimes),
        p95ResponseTime: this.calculatePercentile(this.realtimeMetrics.responsesTimes, 95)
      }
    };
    
    console.log('📊 Performance Report Generated');
    console.log(`⚡ Commands: ${report.systemMetrics.commandsExecuted} | Avg Response: ${report.systemMetrics.averageResponseTime.toFixed(2)}ms | Error Rate: ${report.systemMetrics.errorRate}%`);
    
    this.emit('performanceReport', report);
    return report;
  }
  
  getDetailedStats() {
    return {
      systemMetrics: this.systemMetrics,
      systemHealth: this.systemHealth,
      thresholds: this.thresholds,
      commandMetrics: Object.fromEntries(this.commandMetrics),
      realtimeMetrics: {
        ...this.realtimeMetrics,
        averages: {
          responseTime: this.calculateAverage(this.realtimeMetrics.responsesTimes),
          memory: this.calculateAverage(this.realtimeMetrics.memoryReadings),
          cpu: this.calculateAverage(this.realtimeMetrics.cpuReadings)
        }
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILIDADES MATEMÁTICAS
  // ═══════════════════════════════════════════════════════════════
  
  calculateAverage(array) {
    const validValues = array.filter(val => val > 0);
    return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
  }
  
  calculateMedian(array) {
    const validValues = array.filter(val => val > 0).sort((a, b) => a - b);
    if (validValues.length === 0) return 0;
    
    const mid = Math.floor(validValues.length / 2);
    return validValues.length % 2 === 0 
      ? (validValues[mid - 1] + validValues[mid]) / 2 
      : validValues[mid];
  }
  
  calculatePercentile(array, percentile) {
    const validValues = array.filter(val => val > 0).sort((a, b) => a - b);
    if (validValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * validValues.length) - 1;
    return validValues[Math.min(index, validValues.length - 1)];
  }
  
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 OPTIMIZACIÓN DINÁMICA
  // ═══════════════════════════════════════════════════════════════
  
  optimizeBasedOnMetrics() {
    const recentPerformance = this.getRecentCommandPerformance();
    
    // Si el rendimiento está degradado, activar optimizaciones
    if (recentPerformance.avgResponseTime > this.thresholds.responseTime.warning) {
      console.log('🔧 Activating performance optimizations...');
      
      // Solicitar limpieza de memoria
      memoryManager.performPreventiveCleanup();
      
      // Precargar datos críticos en caché
      cacheManager.preloadCriticalData();
      
      this.emit('optimizationActivated', { reason: 'degraded_performance', metrics: recentPerformance });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🧹 LIMPIEZA Y CIERRE
  // ═══════════════════════════════════════════════════════════════
  
  reset() {
    // Resetear métricas (mantener configuración)
    this.commandMetrics.clear();
    this.systemMetrics = {
      startTime: Date.now(),
      commandsExecuted: 0,
      errorsCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      peakMemoryUsage: 0,
      requestsPerMinute: 0,
      slowCommands: 0
    };
    
    console.log('🔄 Performance metrics reset');
  }
  
  shutdown() {
    console.log('🛑 Shutting down performance monitor...');
    
    // Limpiar intervalos
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.reportInterval) clearInterval(this.reportInterval);
    
    // Reporte final
    const finalReport = this.generatePerformanceReport();
    console.log('📊 Final performance report generated');
    
    console.log('✅ Performance monitor shutdown complete');
    return finalReport;
  }
}

// Instancia singleton
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;