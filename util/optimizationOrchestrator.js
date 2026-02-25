// ═══════════════════════════════════════════════════════════════
// 🔧 INTEGRACIÓN DE SISTEMAS DE OPTIMIZACIÓN Y RENDIMIENTO
// ═══════════════════════════════════════════════════════════════

import cacheManager from './cacheManager.js';
import memoryManager from './memoryManager.js';
import performanceMonitor from './performanceMonitor.js';
import databaseOptimizer from './databaseOptimizer.js';

class OptimizationOrchestrator {
  constructor() {
    this.initialized = false;
    this.systems = {
      cache: cacheManager,
      memory: memoryManager,
      performance: performanceMonitor,
      database: databaseOptimizer
    };
    
    this.setupSystemIntegration();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔗 INTEGRACIÓN DE SISTEMAS
  // ═══════════════════════════════════════════════════════════════
  
  setupSystemIntegration() {
    // Integrar cache con memoria
    memoryManager.on('preventiveCleanup', () => {
      cacheManager.cleanup();
    });
    
    memoryManager.on('aggressiveCleanup', () => {
      cacheManager.clear();
    });
    
    memoryManager.on('criticalMemory', () => {
      performanceMonitor.optimizeBasedOnMetrics();
    });
    
    // Integrar performance con otros sistemas
    performanceMonitor.on('slowCommand', (data) => {
      console.log(`🐌 Slow command optimization triggered for: ${data.command}`);
      
      // Pre-cargar datos relacionados al comando lento
      if (data.command.includes('leaderboard')) {
        cacheManager.preloadLeaderboards();
      } else if (data.command.includes('crypto')) {
        cacheManager.preloadMarketData();
      }
    });
    
    performanceMonitor.on('criticalHealth', () => {
      console.log('🚨 Critical system health - activating emergency optimizations');
      this.emergencyOptimization();
    });
    
    // Integrar database con performance
    databaseOptimizer.on('slowQuery', (data) => {
      console.log(`🗄️ Slow query detected: ${data.sql.substring(0, 50)}...`);
    });
    
    console.log('🔗 System integration completed');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ⚡ OPTIMIZACIÓN PARA COMANDOS
  // ═══════════════════════════════════════════════════════════════
  
  async optimizeForCommand(commandName, userId, interaction) {
    const measurement = performanceMonitor.startCommandMeasurement(commandName, userId);
    
    try {
      // Optimización preventiva basada in el tipo de comando
      memoryManager.optimizeForCommand(this.getCommandType(commandName));
      
      // Pre-cargar datos comunes en caché
      await this.preloadCommandData(commandName, userId);
      
      return {
        measurement,
        
        // Método para obtener datos optimizados
        getOptimizedData: async (key, fetcher) => {
          return await cacheManager.get(key, fetcher);
        },
        
        // Método para ejecutar queries optimizadas
        executeQuery: async (sql, params) => {
          return await databaseOptimizer.executeOptimized(sql, params);
        },
        
        // Método para finalizar el comando
        finish: (success = true, error = null) => {
          measurement.finish(success, error);
        }
      };
      
    } catch (error) {
      measurement.finish(false, error);
      throw error;
    }
  }
  
  getCommandType(commandName) {
    if (['blackjack', 'coinflip', 'crash', 'dados', 'loteria', 'rasca', 'ruleta', 'tragamonedas'].includes(commandName)) {
      return 'gambling';
    }
    if (commandName.startsWith('admin-')) {
      return 'admin';
    }
    if (['crypto-market', 'crypto-news', 'crypto-analytics'].includes(commandName)) {
      return 'crypto';
    }
    return 'general';
  }
  
  async preloadCommandData(commandName, userId) {
    // Pre-cargar datos del usuario
    await cacheManager.getUserData(userId);
    
    // Pre-cargar datos específicos según el comando
    switch (commandName) {
      case 'leaderboard':
      case 'leaderboard-achievements':
        await cacheManager.preloadLeaderboards();
        break;
        
      case 'crypto-market':
      case 'crypto-analytics':
        await cacheManager.preloadMarketData();
        break;
        
      case 'shop':
      case 'inventory':
        await cacheManager.get('shop_items', async () => {
          const [rows] = await databaseOptimizer.executeOptimized(
            'SELECT * FROM shop_inventory WHERE is_available = 1'
          );
          return rows;
        });
        break;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 OPTIMIZACIÓN DE EMERGENCIA
  // ═══════════════════════════════════════════════════════════════
  
  async emergencyOptimization() {
    console.log('🚨 EMERGENCY OPTIMIZATION ACTIVATED');
    
    try {
      // 1. Limpieza agresiva de memoria
      memoryManager.performAggressiveCleanup();
      
      // 2. Limpiar completamente el caché
      cacheManager.clear();
      
      // 3. Forzar garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // 4. Mantenimiento de base de datos
      await databaseOptimizer.performMaintenance();
      
      // 5. Pre-cargar solo datos críticos
      setTimeout(async () => {
        await cacheManager.preloadCriticalData();
      }, 5000);
      
      console.log('✅ Emergency optimization completed');
      
    } catch (error) {
      console.error('❌ Emergency optimization failed:', error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 ESTADÍSTICAS INTEGRADAS
  // ═══════════════════════════════════════════════════════════════
  
  async getSystemStatus() {
    return {
      timestamp: new Date().toISOString(),
      
      cache: {
        status: 'healthy',
        stats: cacheManager.getStats()
      },
      
      memory: {
        status: memoryManager.getSystemStatus().healthy ? 'healthy' : 'degraded',
        stats: memoryManager.getSystemStatus()
      },
      
      performance: {
        health: performanceMonitor.systemHealth,
        metrics: {
          commandsExecuted: performanceMonitor.systemMetrics.commandsExecuted,
          averageResponseTime: performanceMonitor.systemMetrics.averageResponseTime,
          errorRate: (performanceMonitor.systemMetrics.errorsCount / performanceMonitor.systemMetrics.commandsExecuted) * 100
        }
      },
      
      database: {
        status: 'healthy',
        stats: databaseOptimizer.getStats()
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 MÉTODOS DE UTILIDAD PARA COMANDOS
  // ═══════════════════════════════════════════════════════════════
  
  // Método simplificado para usar en comandos existentes
  async executeOptimizedCommand(commandName, userId, commandFunction) {
    const optimizer = await this.optimizeForCommand(commandName, userId);
    
    try {
      const result = await commandFunction({
        getCache: optimizer.getOptimizedData,
        executeQuery: optimizer.executeQuery,
        userId: userId
      });
      
      optimizer.finish(true);
      return result;
      
    } catch (error) {
      optimizer.finish(false, error);
      throw error;
    }
  }
  
  // Wrapper para datos de usuario optimizados
  async getUserDataOptimized(userId) {
    return await cacheManager.getUserData(userId);
  }
  
  // Wrapper para queries optimizadas
  async executeQueryOptimized(sql, params = []) {
    return await databaseOptimizer.executeOptimized(sql, params);
  }
  
  // Wrapper para transacciones optimizadas
  async executeTransactionOptimized(queries) {
    return await databaseOptimizer.executeTransaction(queries);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🛑 SHUTDOWN COORDINADO
  // ═══════════════════════════════════════════════════════════════
  
  async shutdown() {
    console.log('🛑 Shutting down optimization systems...');
    
    try {
      // Shutdown en orden específico
      const finalReport = performanceMonitor.shutdown();
      await databaseOptimizer.close();
      memoryManager.shutdown();
      
      console.log('✅ All optimization systems shut down successfully');
      return finalReport;
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// Instancia singleton
const optimizationOrchestrator = new OptimizationOrchestrator();

// Exportar tanto la instancia como los sistemas individuales
export default optimizationOrchestrator;
export { 
  optimizationOrchestrator,
  cacheManager,
  memoryManager,
  performanceMonitor,
  databaseOptimizer
};