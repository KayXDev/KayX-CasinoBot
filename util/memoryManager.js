// ═══════════════════════════════════════════════════════════════
// 🧠 SISTEMA DE GESTIÓN DE MEMORIA Y RENDIMIENTO
// ═══════════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

class MemoryManager extends EventEmitter {
  constructor() {
    super();
    
    // Configuración de límites
    this.memoryLimits = {
      warning: 200 * 1024 * 1024,    // 200MB warning
      critical: 300 * 1024 * 1024,   // 300MB critical
      maximum: 400 * 1024 * 1024     // 400MB maximum
    };
    
    // Estados del sistema
    this.systemState = {
      healthy: true,
      memoryPressure: false,
      performanceMode: 'normal', // normal, conserve, aggressive
      lastGC: Date.now(),
      gcCount: 0
    };
    
    // Métricas de rendimiento
    this.metrics = {
      memoryUsage: [],
      cpuUsage: [],
      gcTimes: [],
      requestCounts: [],
      responsesTimes: [],
      startTime: Date.now()
    };
    
    // Pools de objetos reutilizables
    this.objectPools = {
      embedObjects: [],
      tempArrays: [],
      responseBuffers: []
    };
    
    this.startMonitoring();
    this.setupGarbageCollection();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 MONITOREO DE MEMORIA
  // ═══════════════════════════════════════════════════════════════
  
  startMonitoring() {
    // Monitoreo cada 30 segundos
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
      this.recordMetrics();
      this.cleanupIfNeeded();
    }, 30000);
    
    // Reporte detallado cada 5 minutos
    this.reportingInterval = setInterval(() => {
      this.generateMemoryReport();
    }, 300000);
    
    console.log('🧠 Memory monitoring started');
  }
  
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapUsed + memUsage.external;
    
    // Actualizar estado del sistema
    if (totalMemory > this.memoryLimits.critical) {
      this.systemState.performanceMode = 'aggressive';
      this.systemState.memoryPressure = true;
      this.systemState.healthy = false;
      
      console.warn(`🚨 CRITICAL MEMORY: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
      this.emit('criticalMemory', { usage: totalMemory, limit: this.memoryLimits.critical });
      
      // Limpieza agresiva inmediata
      this.performAggressiveCleanup();
      
    } else if (totalMemory > this.memoryLimits.warning) {
      this.systemState.performanceMode = 'conserve';
      this.systemState.memoryPressure = true;
      this.systemState.healthy = true;
      
      console.warn(`⚠️ HIGH MEMORY: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
      this.emit('highMemory', { usage: totalMemory, limit: this.memoryLimits.warning });
      
      // Limpieza preventiva
      this.performPreventiveCleanup();
      
    } else {
      this.systemState.performanceMode = 'normal';
      this.systemState.memoryPressure = false;
      this.systemState.healthy = true;
    }
    
    return {
      usage: totalMemory,
      status: this.systemState.performanceMode,
      healthy: this.systemState.healthy
    };
  }
  
  recordMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Registrar métricas (mantener solo los últimos 100 registros)
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });
    
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
    
    // Mantener solo los últimos 100 registros
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🗑️ GARBAGE COLLECTION OPTIMIZADO
  // ═══════════════════════════════════════════════════════════════
  
  setupGarbageCollection() {
    // Forzar GC cuando sea necesario
    if (global.gc) {
      console.log('✅ Manual garbage collection available');
    } else {
      console.log('⚠️ Manual GC not available (use --expose-gc flag)');
    }
    
    // GC programado cada 10 minutos en modo normal
    this.gcInterval = setInterval(() => {
      if (this.systemState.performanceMode === 'normal') {
        this.performGarbageCollection('scheduled');
      }
    }, 600000);
  }
  
  performGarbageCollection(reason = 'manual') {
    if (!global.gc) return false;
    
    const beforeGC = process.memoryUsage();
    const startTime = performance.now();
    
    try {
      global.gc();
      
      const afterGC = process.memoryUsage();
      const gcTime = performance.now() - startTime;
      
      this.systemState.lastGC = Date.now();
      this.systemState.gcCount++;
      
      const memoryFreed = beforeGC.heapUsed - afterGC.heapUsed;
      
      console.log(`🗑️ GC (${reason}): Freed ${(memoryFreed / 1024 / 1024).toFixed(2)}MB in ${gcTime.toFixed(2)}ms`);
      
      this.metrics.gcTimes.push({
        timestamp: Date.now(),
        reason,
        duration: gcTime,
        memoryFreed,
        beforeHeap: beforeGC.heapUsed,
        afterHeap: afterGC.heapUsed
      });
      
      // Mantener solo los últimos 50 registros de GC
      if (this.metrics.gcTimes.length > 50) {
        this.metrics.gcTimes = this.metrics.gcTimes.slice(-50);
      }
      
      this.emit('garbageCollection', {
        reason,
        duration: gcTime,
        memoryFreed,
        totalFreed: memoryFreed
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Error during garbage collection:', error);
      return false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🧹 SISTEMAS DE LIMPIEZA
  // ═══════════════════════════════════════════════════════════════
  
  cleanupIfNeeded() {
    switch (this.systemState.performanceMode) {
      case 'aggressive':
        this.performAggressiveCleanup();
        break;
      case 'conserve':
        this.performPreventiveCleanup();
        break;
      default:
        this.performRoutineCleanup();
    }
  }
  
  performRoutineCleanup() {
    // Limpieza básica regular
    this.cleanObjectPools();
    
    // GC cada 15 minutos en modo normal
    if (Date.now() - this.systemState.lastGC > 900000) {
      this.performGarbageCollection('routine');
    }
  }
  
  performPreventiveCleanup() {
    console.log('🧹 Performing preventive cleanup...');
    
    // Limpiar pools de objetos
    this.cleanObjectPools();
    
    // Limpiar métricas antiguas más agresivamente
    this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
    this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-50);
    this.metrics.gcTimes = this.metrics.gcTimes.slice(-25);
    
    // Forzar GC si ha pasado más de 5 minutos
    if (Date.now() - this.systemState.lastGC > 300000) {
      this.performGarbageCollection('preventive');
    }
    
    // Emitir evento para que otros sistemas hagan limpieza
    this.emit('preventiveCleanup');
  }
  
  performAggressiveCleanup() {
    console.log('🚨 Performing aggressive cleanup...');
    
    // Limpiar completamente los pools
    this.objectPools.embedObjects = [];
    this.objectPools.tempArrays = [];
    this.objectPools.responseBuffers = [];
    
    // Mantener solo métricas esenciales
    this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-20);
    this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-20);
    this.metrics.gcTimes = this.metrics.gcTimes.slice(-10);
    
    // Forzar GC inmediatamente
    this.performGarbageCollection('aggressive');
    
    // Emitir evento de limpieza agresiva
    this.emit('aggressiveCleanup');
    
    // Si sigue crítico después de la limpieza, reportar
    setTimeout(() => {
      const memCheck = this.checkMemoryUsage();
      if (!memCheck.healthy) {
        console.error('🔥 MEMORY STILL CRITICAL AFTER AGGRESSIVE CLEANUP');
        this.emit('memoryLeakSuspected', memCheck);
      }
    }, 5000);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🏊 OBJECT POOLING (REUTILIZACIÓN DE OBJETOS)
  // ═══════════════════════════════════════════════════════════════
  
  getEmbedObject() {
    // Reutilizar objeto embed si está disponible
    if (this.objectPools.embedObjects.length > 0) {
      const embed = this.objectPools.embedObjects.pop();
      // Limpiar propiedades
      Object.keys(embed).forEach(key => delete embed[key]);
      return embed;
    }
    
    // Crear nuevo objeto si no hay disponibles
    return {};
  }
  
  returnEmbedObject(embed) {
    // Devolver objeto al pool para reutilización
    if (this.objectPools.embedObjects.length < 50) { // Límite del pool
      this.objectPools.embedObjects.push(embed);
    }
  }
  
  getTempArray(size = 0) {
    // Reutilizar array temporal
    const arrays = this.objectPools.tempArrays;
    for (let i = 0; i < arrays.length; i++) {
      if (arrays[i].length >= size) {
        const array = arrays.splice(i, 1)[0];
        array.length = 0; // Limpiar contenido
        return array;
      }
    }
    
    // Crear nuevo array si no hay adecuado
    return new Array(size);
  }
  
  returnTempArray(array) {
    // Devolver array al pool
    if (this.objectPools.tempArrays.length < 20 && array.length < 1000) {
      array.length = 0; // Limpiar contenido
      this.objectPools.tempArrays.push(array);
    }
  }
  
  cleanObjectPools() {
    // Limpiar pools de objetos según el modo de rendimiento
    const maxSizes = {
      normal: { embeds: 50, arrays: 20, buffers: 10 },
      conserve: { embeds: 25, arrays: 10, buffers: 5 },
      aggressive: { embeds: 5, arrays: 2, buffers: 1 }
    };
    
    const limits = maxSizes[this.systemState.performanceMode];
    
    // Recortar pools al tamaño apropiado
    this.objectPools.embedObjects = this.objectPools.embedObjects.slice(0, limits.embeds);
    this.objectPools.tempArrays = this.objectPools.tempArrays.slice(0, limits.arrays);
    this.objectPools.responseBuffers = this.objectPools.responseBuffers.slice(0, limits.buffers);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📈 REPORTES Y ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════
  
  generateMemoryReport() {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.metrics.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 1000 / 60)} minutes`,
      
      currentMemory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
      },
      
      systemState: {
        healthy: this.systemState.healthy,
        performanceMode: this.systemState.performanceMode,
        memoryPressure: this.systemState.memoryPressure,
        gcCount: this.systemState.gcCount,
        lastGC: new Date(this.systemState.lastGC).toLocaleTimeString()
      },
      
      objectPools: {
        embedObjects: this.objectPools.embedObjects.length,
        tempArrays: this.objectPools.tempArrays.length,
        responseBuffers: this.objectPools.responseBuffers.length
      },
      
      averages: this.calculateAverages()
    };
    
    console.log('📊 Memory Report:', JSON.stringify(report, null, 2));
    this.emit('memoryReport', report);
    
    return report;
  }
  
  calculateAverages() {
    if (this.metrics.memoryUsage.length === 0) return {};
    
    const recentMemory = this.metrics.memoryUsage.slice(-10);
    const recentGC = this.metrics.gcTimes.slice(-5);
    
    return {
      avgHeapUsed: `${(recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length / 1024 / 1024).toFixed(2)}MB`,
      avgGCTime: recentGC.length > 0 ? `${(recentGC.reduce((sum, gc) => sum + gc.duration, 0) / recentGC.length).toFixed(2)}ms` : 'N/A',
      totalGCFreed: recentGC.length > 0 ? `${(recentGC.reduce((sum, gc) => sum + gc.memoryFreed, 0) / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    };
  }
  
  getSystemStatus() {
    return {
      ...this.systemState,
      currentMemory: process.memoryUsage(),
      poolSizes: {
        embeds: this.objectPools.embedObjects.length,
        arrays: this.objectPools.tempArrays.length,
        buffers: this.objectPools.responseBuffers.length
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 OPTIMIZACIONES ESPECÍFICAS
  // ═══════════════════════════════════════════════════════════════
  
  optimizeForCommand(commandType) {
    // Optimizar memoria según el tipo de comando que se va a ejecutar
    switch (commandType) {
      case 'gambling':
        // Pre-limpiar para comandos de juego (alto uso de memoria)
        this.performPreventiveCleanup();
        break;
        
      case 'admin':
        // Asegurar memoria disponible para operaciones administrativas
        if (this.systemState.memoryPressure) {
          this.performGarbageCollection('admin-prep');
        }
        break;
        
      case 'crypto':
        // Comandos de crypto pueden requerir mucha memoria para cálculos
        this.cleanObjectPools();
        break;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🛑 SHUTDOWN Y LIMPIEZA
  // ═══════════════════════════════════════════════════════════════
  
  shutdown() {
    console.log('🛑 Shutting down memory manager...');
    
    // Limpiar intervalos
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.reportingInterval) clearInterval(this.reportingInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
    
    // Limpieza final
    this.performAggressiveCleanup();
    
    // Reporte final
    this.generateMemoryReport();
    
    console.log('✅ Memory manager shutdown complete');
  }
}

// Instancia singleton
const memoryManager = new MemoryManager();

// Manejar cierre del proceso
process.on('SIGINT', () => {
  memoryManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  memoryManager.shutdown();
  process.exit(0);
});

// Detectar memory leaks potenciales
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('⚠️ Potential memory leak detected:', warning.message);
    memoryManager.emit('potentialLeak', warning);
  }
});

export default memoryManager;