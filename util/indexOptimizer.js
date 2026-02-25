// ═══════════════════════════════════════════════════════════════
// 🚀 SISTEMA DE OPTIMIZACIÓN DE ÍNDICES MYSQL
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db.js';

export class IndexOptimizer {
  constructor() {
    this.appliedIndexes = new Set();
    this.indexStats = {
      created: 0,
      failed: 0,
      skipped: 0,
      performance: new Map()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 ÍNDICES CRÍTICOS PARA MÁXIMO RENDIMIENTO
  // ═══════════════════════════════════════════════════════════════

  getOptimizationIndexes() {
    return {
      // 🏆 USUARIOS - Consultas más frecuentes (95% de las queries)
      users: [
        {
          name: 'idx_users_primary_lookup',
          table: 'users', 
          columns: 'user_id, hand, bank',
          type: 'COVERING',
          priority: 'CRITICAL',
          reason: 'Cubre getUserBalances, getUserBalance - queries más frecuentes'
        },
        {
          name: 'idx_users_leaderboard_total',
          table: 'users',
          columns: '(hand + bank) DESC, user_id',
          type: 'COMPOSITE',
          priority: 'HIGH',
          reason: 'Optimiza leaderboards por balance total'
        },
        {
          name: 'idx_users_leaderboard_bank',
          table: 'users',
          columns: 'bank DESC, user_id',
          type: 'SIMPLE',
          priority: 'HIGH', 
          reason: 'Optimiza leaderboard por bank balance'
        },
        {
          name: 'idx_users_leaderboard_hand',
          table: 'users',
          columns: 'hand DESC, user_id', 
          type: 'SIMPLE',
          priority: 'HIGH',
          reason: 'Optimiza leaderboard por hand balance'
        },
        {
          name: 'idx_users_daily_rewards',
          table: 'users',
          columns: 'user_id, last_daily, daily_streak',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Optimiza sistema de daily rewards'
        },
        {
          name: 'idx_users_weekly_rewards', 
          table: 'users',
          columns: 'user_id, last_weekly, weekly_streak',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Optimiza sistema de weekly rewards'
        }
      ],

      // 🎰 CRYPTO TRADING - Consultas de trading
      crypto: [
        {
          name: 'idx_crypto_trades_user',
          table: 'crypto_trades',
          columns: 'user_id, timestamp DESC',
          type: 'COMPOSITE',
          priority: 'HIGH',
          reason: 'Historial de trades por usuario'
        },
        {
          name: 'idx_crypto_alerts_active',
          table: 'user_crypto_alerts',
          columns: 'user_id, is_active, created_at DESC',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Alertas activas por usuario'
        },
        {
          name: 'idx_crypto_cooldowns',
          table: 'crypto_trading_cooldowns',
          columns: 'user_id, last_trade',
          type: 'COMPOSITE', 
          priority: 'HIGH',
          reason: 'Verificación de cooldowns de trading'
        }
      ],

      // 📋 LOGGING Y ACHIEVEMENTS
      system: [
        {
          name: 'idx_bot_logs_command',
          table: 'bot_logs',
          columns: 'command, timestamp DESC',
          type: 'COMPOSITE',
          priority: 'LOW',
          reason: 'Análisis de comandos usados'
        },
        {
          name: 'idx_achievements_user',
          table: 'user_achievements',
          columns: 'user_id, is_completed, created_at DESC',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Progreso de achievements por usuario'
        },
        {
          name: 'idx_shop_purchases',
          table: 'shop_purchases',
          columns: 'user_id, created_at DESC',
          type: 'COMPOSITE',
          priority: 'LOW',
          reason: 'Historial de compras en shop'
        }
      ],

      // 👥 SOCIAL FEATURES
      social: [
        {
          name: 'idx_friends_lookup',
          table: 'friends',
          columns: 'user_id, friend_id, status',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Sistema de amigos'
        },
        {
          name: 'idx_pending_requests',
          table: 'pending_requests',
          columns: 'user_id, requester_id, created_at DESC',
          type: 'COVERING',
          priority: 'MEDIUM',
          reason: 'Solicitudes de amistad pendientes'
        }
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 MÉTODOS DE APLICACIÓN DE ÍNDICES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verificar si un índice ya existe
   */
  async indexExists(tableName, indexName) {
    try {
      const [rows] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND index_name = ?
      `, [tableName, indexName]);
      
      return rows[0].count > 0;
    } catch (error) {
      console.warn(`Error checking index ${indexName}:`, error.message);
      return false;
    }
  }

  /**
   * Crear un índice de forma segura
   */
  async createIndex(indexConfig) {
    const { name, table, columns, type, priority, reason } = indexConfig;
    
    try {
      // Verificar si ya existe
      if (await this.indexExists(table, name)) {
        console.log(`⏭️  Índice ${name} ya existe, saltando...`);
        this.indexStats.skipped++;
        this.appliedIndexes.add(name);
        return { success: true, status: 'skipped', reason: 'already exists' };
      }

      // Medir tiempo de creación
      const startTime = Date.now();
      
      // Construir query CREATE INDEX
      const createQuery = `CREATE INDEX ${name} ON ${table} (${columns})`;
      
      console.log(`🔨 Creando índice ${priority}: ${name}`);
      console.log(`   Tabla: ${table}`);
      console.log(`   Columnas: ${columns}`);
      console.log(`   Razón: ${reason}`);
      
      // Ejecutar creación del índice
      await pool.query(createQuery);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Índice ${name} creado en ${duration}ms`);
      
      this.indexStats.created++;
      this.appliedIndexes.add(name);
      this.indexStats.performance.set(name, { duration, table, priority });
      
      return { 
        success: true, 
        status: 'created', 
        duration,
        table,
        columns,
        priority 
      };
      
    } catch (error) {
      console.error(`❌ Error creando índice ${name}:`, error.message);
      this.indexStats.failed++;
      
      return { 
        success: false, 
        status: 'failed', 
        error: error.message,
        table,
        columns 
      };
    }
  }

  /**
   * Aplicar todos los índices por prioridad
   */
  async applyAllIndexes() {
    console.log('🚀 INICIANDO OPTIMIZACIÓN DE ÍNDICES MYSQL\n');
    
    const indexes = this.getOptimizationIndexes();
    const results = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Aplicar por orden de prioridad
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    for (const priority of priorities) {
      console.log(`\n🔥 APLICANDO ÍNDICES ${priority}:`);
      console.log('═'.repeat(50));
      
      for (const [category, categoryIndexes] of Object.entries(indexes)) {
        const priorityIndexes = categoryIndexes.filter(idx => idx.priority === priority);
        
        for (const indexConfig of priorityIndexes) {
          const result = await this.createIndex(indexConfig);
          results[priority.toLowerCase()].push(result);
          
          // Pequeña pausa entre índices para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    return results;
  }

  /**
   * Generar reporte de optimización
   */
  generateOptimizationReport(results) {
    console.log('\n📊 REPORTE DE OPTIMIZACIÓN COMPLETADO');
    console.log('═'.repeat(60));
    
    console.log(`✅ Índices creados: ${this.indexStats.created}`);
    console.log(`⏭️  Índices existentes: ${this.indexStats.skipped}`);
    console.log(`❌ Índices fallidos: ${this.indexStats.failed}`);
    
    const totalIndexes = this.indexStats.created + this.indexStats.skipped;
    console.log(`📈 Total de índices activos: ${totalIndexes}`);
    
    // Performance por prioridad
    console.log('\n⚡ TIEMPO DE CREACIÓN POR PRIORIDAD:');
    const performanceByPriority = new Map();
    
    for (const [indexName, perf] of this.indexStats.performance.entries()) {
      if (!performanceByPriority.has(perf.priority)) {
        performanceByPriority.set(perf.priority, []);
      }
      performanceByPriority.get(perf.priority).push(perf.duration);
    }
    
    for (const [priority, durations] of performanceByPriority.entries()) {
      const avgTime = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      console.log(`   ${priority}: ${avgTime}ms promedio (${durations.length} índices)`);
    }
    
    return {
      summary: {
        created: this.indexStats.created,
        skipped: this.indexStats.skipped,
        failed: this.indexStats.failed,
        total: totalIndexes
      },
      performance: Object.fromEntries(this.indexStats.performance),
      appliedIndexes: Array.from(this.appliedIndexes)
    };
  }

  /**
   * Verificar el estado de todos los índices
   */
  async verifyIndexStatus() {
    console.log('\n🔍 VERIFICANDO ESTADO DE ÍNDICES...');
    
    const indexes = this.getOptimizationIndexes();
    const status = {
      existing: 0,
      missing: 0,
      tables: new Map()
    };
    
    for (const [category, categoryIndexes] of Object.entries(indexes)) {
      for (const indexConfig of categoryIndexes) {
        const exists = await this.indexExists(indexConfig.table, indexConfig.name);
        
        if (!status.tables.has(indexConfig.table)) {
          status.tables.set(indexConfig.table, { existing: 0, missing: 0 });
        }
        
        if (exists) {
          status.existing++;
          status.tables.get(indexConfig.table).existing++;
          console.log(`✅ ${indexConfig.name} (${indexConfig.table})`);
        } else {
          status.missing++;
          status.tables.get(indexConfig.table).missing++;
          console.log(`❌ ${indexConfig.name} (${indexConfig.table}) - FALTANTE`);
        }
      }
    }
    
    console.log(`\n📊 Resumen: ${status.existing} existentes, ${status.missing} faltantes`);
    
    return status;
  }
}

export default new IndexOptimizer();