// ═══════════════════════════════════════════════════════════════
// 🗄️ SISTEMA DE OPTIMIZACIÓN DE BASE DE DATOS
// ═══════════════════════════════════════════════════════════════

import mysql from 'mysql2/promise';
import EventEmitter from 'events';

class DatabaseOptimizer extends EventEmitter {
  constructor() {
    super();
    
    // Pool de conexiones optimizado
    this.pool = null;
    this.queryCache = new Map();
    this.batchOperations = new Map();
    
    // Estadísticas de rendimiento
    this.stats = {
      queriesExecuted: 0,
      queriesCached: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      batchOperations: 0,
      totalQueryTime: 0
    };
    
    this.slowQueryThreshold = 1000; // 1 segundo
    this.batchSize = 100;
    this.batchTimeout = 5000; // 5 segundos
    
    this.initializeOptimizedPool();
    this.startPerformanceMonitoring();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 CONFIGURACIÓN DEL POOL OPTIMIZADO
  // ═══════════════════════════════════════════════════════════════
  
  async initializeOptimizedPool() {
    try {
      const yaml = (await import('js-yaml')).default;
      const fs = (await import('fs')).default;
      const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
      
      this.pool = mysql.createPool({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        
        // Configuración optimizada del pool
        connectionLimit: 20,           // Máximo 20 conexiones concurrentes
        acquireTimeout: 60000,         // 60 segundos timeout para obtener conexión
        timeout: 60000,                // 60 segundos timeout para queries
        reconnect: true,               // Reconectar automáticamente
        idleTimeout: 300000,           // 5 minutos para conexiones idle
        queueLimit: 100,               // Máximo 100 queries en cola
        
        // Configuración de performance
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false,
        debug: false,
        trace: true,
        
        // Configuración de SSL si es necesario
        ssl: false,
        
        // Configuración adicional de MySQL
        charset: 'utf8mb4',
        timezone: 'local',
        
        // Configuraciones específicas de rendimiento
        typeCast: function (field, next) {
          // Optimizar casting de tipos
          if (field.type === 'TINY' && field.length === 1) {
            return (field.string() === '1'); // true/false para BOOLEAN
          }
          if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
            return parseFloat(field.string());
          }
          return next();
        }
      });
      
      // Configurar eventos del pool
      this.pool.on('connection', (connection) => {
        console.log('🔗 Nueva conexión MySQL establecida:', connection.threadId);
        
        // Configurar la conexión para máximo rendimiento
        connection.query('SET SESSION sql_mode = "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO"');
        connection.query('SET SESSION innodb_lock_wait_timeout = 10');
        connection.query('SET SESSION lock_wait_timeout = 10');
      });
      
      this.pool.on('acquire', (connection) => {
        console.log(`📥 Conexión ${connection.threadId} adquirida del pool`);
      });
      
      this.pool.on('release', (connection) => {
        console.log(`📤 Conexión ${connection.threadId} liberada al pool`);
      });
      
      // Verificar conectividad
      await this.testConnection();
      console.log('✅ Pool de base de datos optimizado inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando pool optimizado:', error);
      throw error;
    }
  }
  
  async testConnection() {
    try {
      const [rows] = await this.pool.execute('SELECT 1 as test, NOW() as timestamp');
      console.log('🔍 Test de conexión exitoso:', rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      return false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ⚡ EJECUCIÓN OPTIMIZADA DE QUERIES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Ejecutar query con optimizaciones y métricas
   */
  async executeOptimized(sql, params = []) {
    const startTime = Date.now();
    const queryHash = this.hashQuery(sql, params);
    
    try {
      // Verificar cache de queries (solo para SELECT)
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const cached = this.queryCache.get(queryHash);
        if (cached && Date.now() - cached.timestamp < 30000) { // 30 segundos cache
          this.stats.queriesCached++;
          return cached.result;
        }
      }
      
      // Ejecutar query
      const [rows, fields] = await this.pool.execute(sql, params);
      
      // Calcular métricas
      const queryTime = Date.now() - startTime;
      this.updateQueryStats(queryTime, sql);
      
      // Log de queries lentas
      if (queryTime > this.slowQueryThreshold) {
        console.warn(`🐌 Slow query detected (${queryTime}ms):`, sql.substring(0, 100));
        this.stats.slowQueries++;
        this.emit('slowQuery', { sql, params, queryTime });
      }
      
      // Cache result si es SELECT
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.queryCache.set(queryHash, {
          result: [rows, fields],
          timestamp: Date.now()
        });
        
        // Limpiar cache si es muy grande
        if (this.queryCache.size > 1000) {
          this.cleanQueryCache();
        }
      }
      
      return [rows, fields];
      
    } catch (error) {
      const queryTime = Date.now() - startTime;
      console.error(`❌ Query error (${queryTime}ms):`, error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      
      this.emit('queryError', { sql, params, error, queryTime });
      throw error;
    }
  }
  
  /**
   * Ejecutar múltiples queries en transacción
   */
  async executeTransaction(queries) {
    const connection = await this.pool.getConnection();
    const startTime = Date.now();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { sql, params } of queries) {
        const [rows] = await connection.execute(sql, params || []);
        results.push(rows);
      }
      
      await connection.commit();
      
      const transactionTime = Date.now() - startTime;
      console.log(`✅ Transaction completed in ${transactionTime}ms (${queries.length} queries)`);
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      console.error('❌ Transaction failed, rolled back:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📦 OPERACIONES BATCH (POR LOTES)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Agregar operación a batch
   */
  addToBatch(batchType, operation) {
    if (!this.batchOperations.has(batchType)) {
      this.batchOperations.set(batchType, []);
      
      // Programar ejecución del batch
      setTimeout(() => {
        this.executeBatch(batchType);
      }, this.batchTimeout);
    }
    
    const batch = this.batchOperations.get(batchType);
    batch.push(operation);
    
    // Ejecutar inmediatamente si alcanza el tamaño máximo
    if (batch.length >= this.batchSize) {
      this.executeBatch(batchType);
    }
  }
  
  /**
   * Ejecutar batch de operaciones
   */
  async executeBatch(batchType) {
    const operations = this.batchOperations.get(batchType);
    if (!operations || operations.length === 0) return;
    
    // Limpiar batch
    this.batchOperations.delete(batchType);
    
    const startTime = Date.now();
    console.log(`📦 Executing batch ${batchType} with ${operations.length} operations`);
    
    try {
      switch (batchType) {
        case 'userUpdate':
          await this.executeBatchUserUpdates(operations);
          break;
        case 'log':
          await this.executeBatchLogs(operations);
          break;
        case 'achievement':
          await this.executeBatchAchievements(operations);
          break;
        default:
          // Batch genérico
          await this.executeGenericBatch(operations);
      }
      
      const batchTime = Date.now() - startTime;
      console.log(`✅ Batch ${batchType} completed in ${batchTime}ms`);
      this.stats.batchOperations++;
      
    } catch (error) {
      console.error(`❌ Batch ${batchType} failed:`, error);
      
      // Intentar ejecutar operaciones individualmente como fallback
      for (const operation of operations) {
        try {
          await this.executeOptimized(operation.sql, operation.params);
        } catch (individualError) {
          console.error('❌ Individual operation failed:', individualError);
        }
      }
    }
  }
  
  async executeBatchUserUpdates(operations) {
    const sql = `
      INSERT INTO users (user_id, hand, bank, last_activity) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE 
        hand = VALUES(hand),
        bank = VALUES(bank),
        last_activity = VALUES(last_activity)
    `;
    
    const values = operations.map(op => op.values);
    await this.pool.query(sql, [values]);
  }
  
  async executeBatchLogs(operations) {
    const sql = `
      INSERT INTO bot_logs (level, category, command, user_id, message, data, created_at) 
      VALUES ?
    `;
    
    const values = operations.map(op => op.values);
    await this.pool.query(sql, [values]);
  }
  
  async executeBatchAchievements(operations) {
    const sql = `
      INSERT INTO user_achievements (user_id, achievement_id, progress_current, is_completed, completed_at) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE 
        progress_current = VALUES(progress_current),
        is_completed = VALUES(is_completed),
        completed_at = VALUES(completed_at)
    `;
    
    const values = operations.map(op => op.values);
    await this.pool.query(sql, [values]);
  }
  
  async executeGenericBatch(operations) {
    // Agrupar por tipo de SQL
    const groups = {};
    operations.forEach(op => {
      const key = op.sql;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op.params);
    });
    
    // Ejecutar cada grupo
    for (const [sql, paramsList] of Object.entries(groups)) {
      for (const params of paramsList) {
        await this.executeOptimized(sql, params);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 MONITOREO Y ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════
  
  updateQueryStats(queryTime, sql) {
    this.stats.queriesExecuted++;
    this.stats.totalQueryTime += queryTime;
    this.stats.averageQueryTime = this.stats.totalQueryTime / this.stats.queriesExecuted;
  }
  
  getStats() {
    return {
      ...this.stats,
      poolStats: {
        totalConnections: this.pool?.pool?._allConnections?.length || 0,
        freeConnections: this.pool?.pool?._freeConnections?.length || 0,
        acquiringConnections: this.pool?.pool?._acquiringConnections?.length || 0,
        queuedConnections: this.pool?.pool?._connectionQueue?.length || 0
      },
      cacheStats: {
        cacheSize: this.queryCache.size,
        hitRate: this.stats.queriesCached / (this.stats.queriesExecuted || 1) * 100
      }
    };
  }
  
  startPerformanceMonitoring() {
    // Reporte cada 10 minutos
    setInterval(() => {
      const stats = this.getStats();
      console.log(`📊 DB Stats: ${stats.queriesExecuted} queries, ${stats.averageQueryTime.toFixed(2)}ms avg, ${stats.slowQueries} slow queries`);
      
      // Alertas de rendimiento
      if (stats.averageQueryTime > 500) {
        console.warn(`⚠️ High average query time: ${stats.averageQueryTime.toFixed(2)}ms`);
      }
      
      if (stats.poolStats.queuedConnections > 10) {
        console.warn(`⚠️ High connection queue: ${stats.poolStats.queuedConnections}`);
      }
      
    }, 600000); // 10 minutos
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🧹 LIMPIEZA Y MANTENIMIENTO
  // ═══════════════════════════════════════════════════════════════
  
  cleanQueryCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > 30000) { // 30 segundos
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.queryCache.delete(key));
    console.log(`🧹 Cleaned ${expiredKeys.length} expired query cache entries`);
  }
  
  async performMaintenance() {
    console.log('🔧 Performing database maintenance...');
    
    try {
      // Limpiar cache de queries
      this.cleanQueryCache();
      
      // Analizar tablas principales
      await this.analyzeImportantTables();
      
      // Optimizar tablas si es necesario
      await this.optimizeTablesIfNeeded();
      
      console.log('✅ Database maintenance completed');
      
    } catch (error) {
      console.error('❌ Database maintenance failed:', error);
    }
  }
  
  async analyzeImportantTables() {
    const tables = ['users', 'user_inventory', 'bot_logs', 'crypto_holdings'];
    
    for (const table of tables) {
      try {
        await this.executeOptimized(`ANALYZE TABLE ${table}`);
      } catch (error) {
        console.warn(`Warning: Could not analyze table ${table}:`, error.message);
      }
    }
  }
  
  async optimizeTablesIfNeeded() {
    // Solo optimizar si hay muchas operaciones
    if (this.stats.queriesExecuted > 10000) {
      try {
        const tables = ['users', 'user_inventory'];
        for (const table of tables) {
          await this.executeOptimized(`OPTIMIZE TABLE ${table}`);
        }
        
        // Reset stats después de optimización
        this.stats.queriesExecuted = 0;
        this.stats.totalQueryTime = 0;
        this.stats.averageQueryTime = 0;
        
      } catch (error) {
        console.warn('Warning: Table optimization failed:', error.message);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 UTILIDADES
  // ═══════════════════════════════════════════════════════════════
  
  hashQuery(sql, params) {
    const crypto = require('crypto');
    const combined = sql + JSON.stringify(params);
    return crypto.createHash('md5').update(combined).digest('hex');
  }
  
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔐 Database pool closed');
    }
  }
}

// Instancia singleton
const dbOptimizer = new DatabaseOptimizer();

export default dbOptimizer;