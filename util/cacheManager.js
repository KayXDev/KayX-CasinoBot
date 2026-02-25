// ═══════════════════════════════════════════════════════════════
// ⚡ SISTEMA DE CACHE AVANZADO
// ═══════════════════════════════════════════════════════════════

import NodeCache from 'node-cache';
import EventEmitter from 'events';

class CacheManager extends EventEmitter {
  constructor() {
    super();
    
    // Diferentes tipos de cache con TTL específicos
    this.caches = {
      // User data - 5 minutos
      userData: new NodeCache({ 
        stdTTL: 300, 
        checkperiod: 60,
        useClones: false,
        maxKeys: 10000
      }),
      
      // Config data - 30 minutos
      config: new NodeCache({ 
        stdTTL: 1800, 
        checkperiod: 300,
        useClones: false,
        maxKeys: 100
      }),
      
      // Leaderboards - 5 minutos
      leaderboards: new NodeCache({ 
        stdTTL: 300, 
        checkperiod: 60,
        useClones: false,
        maxKeys: 50
      }),
      
      // Achievements - 10 minutos
      achievements: new NodeCache({ 
        stdTTL: 600, 
        checkperiod: 120,
        useClones: false,
        maxKeys: 5000
      }),
      
      // Market data - 1 minuto
      market: new NodeCache({ 
        stdTTL: 60, 
        checkperiod: 30,
        useClones: false,
        maxKeys: 200
      }),
      
      // Session data (login states, etc) - 1 hora
      sessions: new NodeCache({ 
        stdTTL: 3600, 
        checkperiod: 600,
        useClones: false,
        maxKeys: 1000
      })
    };
    
    // Estadísticas de cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
    
    this.setupEventListeners();
    this.startCleanupRoutines();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 MÉTODOS PRINCIPALES DE CACHE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Obtener datos del cache
   */
  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      console.warn(`Cache type ${cacheType} no existe`);
      return null;
    }
    
    const value = this.caches[cacheType].get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      this.emit('hit', { cacheType, key, value });
      return value;
    } else {
      this.stats.misses++;
      this.emit('miss', { cacheType, key });
      return null;
    }
  }
  
  /**
   * Establecer datos en cache
   */
  set(cacheType, key, value, ttl = null) {
    if (!this.caches[cacheType]) {
      console.warn(`Cache type ${cacheType} no existe`);
      return false;
    }
    
    const success = this.caches[cacheType].set(key, value, ttl || undefined);
    
    if (success) {
      this.stats.sets++;
      this.emit('set', { cacheType, key, value, ttl });
    }
    
    return success;
  }
  
  /**
   * Eliminar datos del cache
   */
  delete(cacheType, key) {
    if (!this.caches[cacheType]) {
      return false;
    }
    
    const deleted = this.caches[cacheType].del(key);
    
    if (deleted > 0) {
      this.stats.deletes++;
      this.emit('delete', { cacheType, key });
    }
    
    return deleted > 0;
  }
  
  /**
   * Limpiar cache completo de un tipo
   */
  flush(cacheType) {
    if (!this.caches[cacheType]) {
      return false;
    }
    
    this.caches[cacheType].flushAll();
    this.emit('flush', { cacheType });
    return true;
  }
  
  /**
   * Limpiar todos los caches
   */
  flushAll() {
    Object.keys(this.caches).forEach(cacheType => {
      this.caches[cacheType].flushAll();
    });
    
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
    this.emit('flushAll');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🎯 MÉTODOS ESPECIALIZADOS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cache inteligente con función de fallback
   */
  async getOrSet(cacheType, key, fallbackFunction, ttl = null) {
    // Intentar obtener del cache
    let value = this.get(cacheType, key);
    
    if (value !== null) {
      return value;
    }
    
    // Si no está en cache, ejecutar función de fallback
    try {
      value = await fallbackFunction();
      
      if (value !== null && value !== undefined) {
        this.set(cacheType, key, value, ttl);
      }
      
      return value;
    } catch (error) {
      console.error(`Error en fallback para cache ${cacheType}:${key}`, error);
      return null;
    }
  }
  
  /**
   * Cache con refresh automático
   */
  async refreshCache(cacheType, key, refreshFunction, ttl = null) {
    try {
      const newValue = await refreshFunction();
      
      if (newValue !== null && newValue !== undefined) {
        this.set(cacheType, key, newValue, ttl);
        this.emit('refresh', { cacheType, key, value: newValue });
      }
      
      return newValue;
    } catch (error) {
      console.error(`Error refreshing cache ${cacheType}:${key}`, error);
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📈 ESTADÍSTICAS Y MONITOREO
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    const totalKeys = Object.keys(this.caches).reduce((total, cacheType) => {
      return total + this.caches[cacheType].keys().length;
    }, 0);
    
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    const cacheDetails = {};
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      cacheDetails[cacheType] = {
        keys: cache.keys().length,
        stats: cache.getStats()
      };
    });
    
    return {
      ...this.stats,
      totalKeys,
      hitRate: parseFloat(hitRate),
      details: cacheDetails,
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Obtener información detallada de un cache específico
   */
  getCacheInfo(cacheType) {
    if (!this.caches[cacheType]) {
      return null;
    }
    
    const cache = this.caches[cacheType];
    return {
      keys: cache.keys(),
      stats: cache.getStats(),
      options: cache.options
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 CONFIGURACIÓN Y MANTENIMIENTO
  // ═══════════════════════════════════════════════════════════════
  
  setupEventListeners() {
    // Eventos de limpieza automática
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      
      cache.on('expired', (key, value) => {
        this.emit('expired', { cacheType, key, value });
      });
      
      cache.on('del', (key, value) => {
        this.emit('deleted', { cacheType, key, value });
      });
    });
  }
  
  startCleanupRoutines() {
    // Limpieza automática cada 10 minutos
    setInterval(() => {
      this.performMaintenance();
    }, 600000); // 10 minutos
    
    // Reporte de estadísticas cada hora
    setInterval(() => {
      const stats = this.getStats();
      console.log(`📊 Cache Stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.hitRate}% hit rate, ${stats.totalKeys} keys`);
      
      // Alerta si el hit rate es muy bajo
      if (stats.hitRate < 50 && stats.hits + stats.misses > 100) {
        console.warn(`⚠️ Low cache hit rate: ${stats.hitRate}%`);
      }
    }, 3600000); // 1 hora
  }
  
  performMaintenance() {
    // Limpiar caches que no se han usado recientemente
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      const keys = cache.keys();
      
      // Si hay demasiadas keys, limpiar las más antiguas
      if (keys.length > cache.options.maxKeys * 0.9) {
        console.log(`🧹 Cleaning up cache ${cacheType}: ${keys.length} keys`);
        
        // Eliminar 20% de las keys más antiguas
        const keysToDelete = Math.floor(keys.length * 0.2);
        keys.slice(0, keysToDelete).forEach(key => {
          cache.del(key);
        });
      }
    });
    
    // Garbage collection si es necesario
    if (global.gc && this.getStats().totalKeys > 5000) {
      global.gc();
    }
    
    this.emit('maintenance');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🎯 MÉTODOS DE UTILIDAD ESPECÍFICOS PARA EL BOT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cache para datos de usuario
   */
  async getUserData(userId, fallbackFunction) {
    return this.getOrSet('userData', `user:${userId}`, fallbackFunction, 300);
  }
  
  /**
   * Cache para leaderboards
   */
  async getLeaderboard(type, fallbackFunction) {
    return this.getOrSet('leaderboards', `leaderboard:${type}`, fallbackFunction, 300);
  }
  
  /**
   * Cache para configuración
   */
  async getConfig(configKey, fallbackFunction) {
    return this.getOrSet('config', `config:${configKey}`, fallbackFunction, 1800);
  }
  
  /**
   * Cache para datos de mercado
   */
  async getMarketData(symbol, fallbackFunction) {
    return this.getOrSet('market', `market:${symbol}`, fallbackFunction, 60);
  }
  
  /**
   * Invalidar cache de usuario (para cuando se actualizan datos)
   */
  invalidateUser(userId) {
    this.delete('userData', `user:${userId}`);
    this.delete('achievements', `achievements:${userId}`);
    this.delete('sessions', `session:${userId}`);
  }
  
  /**
   * Invalidar leaderboards (cuando hay cambios significativos)
   */
  invalidateLeaderboards() {
    this.flush('leaderboards');
  }
  
  /**
   * Precargar datos críticos
   */
  async preloadCriticalData() {
    console.log('🚀 Precargando datos críticos en cache...');
    
    try {
      // Precargar configuración
      await this.getConfig('main', async () => {
        const yaml = (await import('js-yaml')).default;
        const fs = (await import('fs')).default;
        return yaml.load(fs.readFileSync('./config.yml', 'utf8'));
      });
      
      // Precargar leaderboards principales
      await this.getLeaderboard('total', async () => {
        const { getComprehensiveLeaderboard } = await import('../db.js');
        return getComprehensiveLeaderboard(20);
      });
      
      console.log('✅ Datos críticos precargados');
    } catch (error) {
      console.error('❌ Error precargando datos:', error);
    }
  }
}

// Instancia singleton
const cacheManager = new CacheManager();

export default cacheManager;