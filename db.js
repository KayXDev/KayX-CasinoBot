// db.js
// MySQL connection helper for casino bot

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

export const dbConfig = config.database;

export const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  
  // ═══════════════════════════════════════════════════════════════
  // 🚀 CONFIGURACIÓN OPTIMIZADA DE CONEXIONES  
  // ═══════════════════════════════════════════════════════════════
  connectionLimit: 50,              // ⬆️ 10 → 50 (5x más conexiones)
  idleTimeout: 300000,              // 5 min antes de cerrar conexión idle
  queueLimit: 0,                    // Sin límite de cola (permite picos de tráfico)
  
  // ═══════════════════════════════════════════════════════════════
  // 🔧 OPTIMIZACIONES DE RENDIMIENTO
  // ═══════════════════════════════════════════════════════════════
  supportBigNumbers: true,          // Soporte para números grandes (casino balances)
  bigNumberStrings: true,           // Convertir big numbers a strings (precisión)
  dateStrings: false,               // Mantener dates como Date objects
  multipleStatements: false,        // Seguridad: desactivar multiple statements
  
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ CONFIGURACIÓN DE SEGURIDAD Y DEBUGGING
  // ═══════════════════════════════════════════════════════════════
  trace: false,                     // Desactivar tracing (rendimiento)
  debug: false,                     // Desactivar debug (rendimiento) 
  ssl: false,                       // SSL según configuración
  charset: 'utf8mb4',              // Soporte completo UTF-8 (emojis, caracteres especiales)
  
  waitForConnections: true
});

// ═══════════════════════════════════════════════════════════════
// 📊 FUNCIONES DE MONITOREO DEL POOL OPTIMIZADO
// ═══════════════════════════════════════════════════════════════

/**
 * Obtener estadísticas detalladas del pool de conexiones
 */
export function getPoolStats() {
  const poolInfo = pool.pool;
  return {
    // Conexiones activas
    activeConnections: poolInfo._allConnections?.length || 0,
    freeConnections: poolInfo._freeConnections?.length || 0,
    
    // Queue y límites
    queuedRequests: poolInfo._connectionQueue?.length || 0,
    connectionLimit: poolInfo.config.connectionLimit,
    
    // Estado del pool
    acquireTimeout: poolInfo.config.acquireTimeout,
    idleTimeout: poolInfo.config.idleTimeout,
    
    // Estadísticas calculadas
    utilizationPercent: Math.round(((poolInfo._allConnections?.length || 0) / poolInfo.config.connectionLimit) * 100),
    healthStatus: poolInfo._freeConnections?.length > 0 ? 'healthy' : 'stressed'
  };
}

/**
 * Obtener estado de salud del pool con recomendaciones
 */
export function getPoolHealth() {
  const stats = getPoolStats();
  const health = {
    status: 'healthy',
    warnings: [],
    recommendations: []
  };
  
  // Verificar utilización alta
  if (stats.utilizationPercent > 90) {
    health.status = 'critical';
    health.warnings.push('Pool utilization above 90%');
    health.recommendations.push('Consider increasing connectionLimit');
  } else if (stats.utilizationPercent > 70) {
    health.status = 'warning';
    health.warnings.push('Pool utilization above 70%');
  }
  
  // Verificar cola
  if (stats.queuedRequests > 10) {
    health.status = 'warning';
    health.warnings.push(`${stats.queuedRequests} queued requests`);
    health.recommendations.push('Monitor query performance');
  }
  
  return { ...stats, ...health };
}

/**
 * Log de estadísticas del pool (para debugging)
 */
export function logPoolStats() {
  const stats = getPoolStats();
  console.log(`
🔌 Database Pool Stats:
   Active: ${stats.activeConnections}/${stats.connectionLimit} (${stats.utilizationPercent}%)
   Free: ${stats.freeConnections}
   Queued: ${stats.queuedRequests}
   Status: ${stats.healthStatus}
  `);
}

// ═══════════════════════════════════════════════════════════════
// 📊 FUNCIONES DE ANÁLISIS DE RENDIMIENTO DE CONSULTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtener información de índices de una tabla
 */
export async function getTableIndexes(tableName) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        INDEX_NAME as indexName,
        COLUMN_NAME as columnName,
        SEQ_IN_INDEX as position,
        NON_UNIQUE as nonUnique
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [tableName]);
    
    return rows;
  } catch (error) {
    console.error(`Error getting indexes for ${tableName}:`, error.message);
    return [];
  }
}

/**
 * Analizar rendimiento de una consulta específica
 */
export async function analyzeQueryPerformance(query, params = []) {
  try {
    const startTime = Date.now();
    
    // Ejecutar EXPLAIN para ver plan de ejecución
    const [explainResult] = await pool.query(`EXPLAIN ${query}`, params);
    
    // Ejecutar query real para medir tiempo
    const [queryResult] = await pool.query(query, params);
    
    const executionTime = Date.now() - startTime;
    
    return {
      executionTime,
      rowsExamined: explainResult[0]?.rows || 0,
      indexUsed: explainResult[0]?.key || 'NONE',
      queryType: explainResult[0]?.select_type || 'SIMPLE',
      performance: executionTime < 10 ? 'excellent' : 
                  executionTime < 50 ? 'good' : 
                  executionTime < 200 ? 'acceptable' : 'poor'
    };
  } catch (error) {
    return {
      executionTime: -1,
      error: error.message,
      performance: 'failed'
    };
  }
}

/**
 * Obtener estadísticas completas de rendimiento de DB
 */
export async function getDatabasePerformanceStats() {
  const poolStats = getPoolStats();
  
  // Test de consultas críticas
  const criticalQueries = [
    {
      name: 'User Balance Lookup',
      query: 'SELECT hand, bank FROM users WHERE user_id = ? LIMIT 1',
      params: ['test_user']
    },
    {
      name: 'Top 10 Leaderboard',
      query: 'SELECT user_id, (hand + bank) as total FROM users ORDER BY total DESC LIMIT 10',
      params: []
    },
    {
      name: 'Daily Rewards Check',
      query: 'SELECT last_daily, daily_streak FROM users WHERE user_id = ? LIMIT 1',
      params: ['test_user']
    }
  ];
  
  const queryPerformance = [];
  for (const testQuery of criticalQueries) {
    const perf = await analyzeQueryPerformance(testQuery.query, testQuery.params);
    queryPerformance.push({
      ...testQuery,
      ...perf
    });
  }
  
  return {
    pool: poolStats,
    queries: queryPerformance,
    timestamp: new Date().toISOString(),
    overallHealth: queryPerformance.every(q => q.performance !== 'poor') ? 'healthy' : 'needs_optimization'
  };
}

export async function getUserBalances(userId) {
  const [rows] = await pool.query('SELECT hand, bank FROM users WHERE user_id = ?', [userId]);
  if (rows.length === 0) return null;
  return { hand: Number(rows[0].hand), bank: Number(rows[0].bank) };
}

export async function setUserBalances(userId, hand, bank) {
  await pool.query('INSERT INTO users (user_id, hand, bank) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE hand = ?, bank = ?', [userId, hand, bank, hand, bank]);
}

// Obtener balance total del usuario (hand + bank)
export async function getUserBalance(userId) {
  const [rows] = await pool.query('SELECT (hand + bank) as total FROM users WHERE user_id = ?', [userId]);
  if (rows.length === 0) return 0;
  return Number(rows[0].total);
}

// Actualizar balance del usuario (agregar a hand)
export async function updateUserBalance(userId, amount) {
  await pool.query('UPDATE users SET hand = hand + ? WHERE user_id = ?', [amount, userId]);
}

// Obtener todos los usuarios registrados
export async function getAllUsers() {
  const [rows] = await pool.query('SELECT user_id, hand, bank FROM users ORDER BY user_id');
  return rows.map(row => ({
    user_id: row.user_id,
    hand: Number(row.hand),
    bank: Number(row.bank)
  }));
}

export async function addUserIfNotExists(userId, initialHand = null, initialBank = 0) {
  // Get initial hand from config if not provided
  if (initialHand === null) {
    initialHand = config.casino?.saldo_inicial || 1000;
  }
  await pool.query('INSERT IGNORE INTO users (user_id, hand, bank) VALUES (?, ?, ?)', [userId, initialHand, initialBank]);
}

// Ensure users table exists
export async function ensureUsersTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(32) PRIMARY KEY,
    hand BIGINT NOT NULL DEFAULT 0,
    bank BIGINT NOT NULL DEFAULT 0
  )`);
  
  // Agregar columnas de recompensas si no existen
  try {
    await pool.query(`ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_daily DATETIME NULL DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS last_weekly DATETIME NULL DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS daily_streak INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS weekly_streak INT DEFAULT 0
    `);
    
    // Crear índices para optimizar consultas
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_last_daily ON users(last_daily)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_last_weekly ON users(last_weekly)`);
  } catch (error) {
    // Si hay error con ALTER TABLE (MySQL versión antigua), usar ADD COLUMN individual
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN last_daily DATETIME NULL DEFAULT NULL`);
    } catch (e) {} // Columna ya existe
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN last_weekly DATETIME NULL DEFAULT NULL`);
    } catch (e) {} // Columna ya existe
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN daily_streak INT DEFAULT 0`);
    } catch (e) {} // Columna ya existe
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN weekly_streak INT DEFAULT 0`);
    } catch (e) {} // Columna ya existe
  }
}

// Ensure user achievements table exists
export async function ensureUserAchievementsTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS user_achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      achievement_type VARCHAR(50) NOT NULL,
      achievement_name VARCHAR(100) NOT NULL,
      achievement_description TEXT NOT NULL,
      reward_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      portfolio_value DECIMAL(15, 2) DEFAULT NULL,
      total_trades INT DEFAULT NULL,
      crypto_owned JSON DEFAULT NULL,
      market_event VARCHAR(100) DEFAULT NULL,
      INDEX idx_user_achievements (user_id, unlocked_at),
      INDEX idx_achievement_type (achievement_type, unlocked_at),
      INDEX idx_recent_achievements (unlocked_at DESC),
      UNIQUE KEY unique_user_achievement (user_id, achievement_type)
    )`);
    
    console.log('✅ User achievements table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating user achievements table:', error);
  }
}

// Ensure crypto alerts tables exist
export async function ensureCryptoAlertsTables() {
  try {
    // Tabla de alertas de usuarios
    await pool.query(`CREATE TABLE IF NOT EXISTS user_crypto_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      crypto_symbol VARCHAR(10) NOT NULL,
      alert_type ENUM('above', 'below', 'change_percent') NOT NULL,
      target_price DECIMAL(15, 8) DEFAULT NULL,
      change_percent DECIMAL(8, 4) DEFAULT NULL,
      message TEXT DEFAULT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      triggered_count INT NOT NULL DEFAULT 0,
      last_triggered TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_alerts (user_id, is_active),
      INDEX idx_active_alerts (is_active, crypto_symbol),
      INDEX idx_alert_checks (crypto_symbol, alert_type, is_active)
    )`);

    // Tabla de historial de alertas
    await pool.query(`CREATE TABLE IF NOT EXISTS crypto_alert_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      crypto_symbol VARCHAR(10) NOT NULL,
      alert_type VARCHAR(20) NOT NULL,
      target_price DECIMAL(15, 8) DEFAULT NULL,
      actual_price DECIMAL(15, 8) NOT NULL,
      message TEXT DEFAULT NULL,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_history (user_id, triggered_at),
      INDEX idx_recent_alerts (triggered_at DESC)
    )`);
    
    console.log('✅ Crypto alerts tables verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating crypto alerts tables:', error);
  }
}

// Función para ver y arreglar la estructura de la tabla
export async function fixInventoryTable() {
  try {
    // console.log('🔍 Checking table structure...');
    const [indexes] = await pool.query('SHOW INDEX FROM user_inventory');
    // console.log('📋 Current indexes:', indexes.map(idx => idx.Key_name));
    
    // Intentar eliminar la restricción unique_user_item si existe
    const hasUniqueConstraint = indexes.some(idx => idx.Key_name === 'unique_user_item');
    
    if (hasUniqueConstraint) {
      console.log('🔧 Found unique_user_item constraint, removing...');
      await pool.query(`ALTER TABLE user_inventory DROP INDEX unique_user_item`);
      console.log('✅ Successfully removed unique_user_item constraint');
    } else {
      // console.log('ℹ️ No unique_user_item constraint found');
    }
  } catch (error) {
    console.error('❌ Error in fixInventoryTable:', error.message);
  }
}

// Inventory functions
export async function ensureInventoryTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_item_id (item_id)
  )`);
  
  // La restricción unique ya fue eliminada por fixInventoryTable()

  await pool.query(`CREATE TABLE IF NOT EXISTS active_effects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    effect_type VARCHAR(50) NOT NULL,
    effect_value DECIMAL(10, 2) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    source_item VARCHAR(50) NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_effect_type (effect_type),
    INDEX idx_end_time (end_time)
  )`);
}

export async function addItemToInventory(userId, itemId, quantity = 1) {
  // Cada compra crea una nueva entrada individual para permitir múltiples items del mismo tipo
  await pool.query(`INSERT INTO user_inventory (user_id, item_id, quantity) 
    VALUES (?, ?, ?)`, 
    [userId, itemId, quantity]);
}

export async function getUserInventory(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM user_inventory WHERE user_id = ? ORDER BY purchased_at DESC', 
    [userId]
  );
  return rows;
}

export async function removeItemFromInventory(userId, itemId, quantity = 1) {
  // Eliminar directamente las entradas más antiguas (cantidad de registros especificada)
  const [result] = await pool.query(
    'DELETE FROM user_inventory WHERE user_id = ? AND item_id = ? AND used_at IS NULL ORDER BY id LIMIT ?',
    [userId, itemId, quantity]
  );
  
  return result.affectedRows > 0;
}

// Eliminar item específico del inventario regular (TODAS las cantidades)
export async function removeAllItemFromInventory(userId, itemId) {
  const [result] = await pool.query(
    'DELETE FROM user_inventory WHERE user_id = ? AND item_id = ? AND used_at IS NULL',
    [userId, itemId]
  );
  
  return result.affectedRows > 0;
}

// Eliminar TODO el inventario regular de un usuario
export async function clearUserInventory(userId) {
  const [result] = await pool.query(
    'DELETE FROM user_inventory WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
  
  return result.affectedRows > 0;
}

// Obtener todos los usuarios que tienen items (regular + heist)
export async function getAllUsersWithAnyItems() {
  const [regularUsers] = await pool.query(`
    SELECT user_id, 
           GROUP_CONCAT(CONCAT(item_id, '(', item_count, ')')) as regular_items
    FROM (
      SELECT user_id, item_id, COUNT(*) as item_count
      FROM user_inventory 
      WHERE used_at IS NULL 
      GROUP BY user_id, item_id
    ) as counted_items
    GROUP BY user_id
  `);
  
  const [heistEquipUsers] = await pool.query(`
    SELECT DISTINCT user_id,
           GROUP_CONCAT(DISTINCT item_type) as equipment_items
    FROM user_heist_equipment 
    WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY user_id
  `);
  
  const [heistConsUsers] = await pool.query(`
    SELECT DISTINCT user_id,
           GROUP_CONCAT(CONCAT(item_type, '(', quantity, ')')) as consumable_items
    FROM user_heist_consumables 
    WHERE quantity > 0 AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY user_id
  `);
  
  // Combinar todos los usuarios
  const userMap = new Map();
  
  regularUsers.forEach(user => {
    userMap.set(user.user_id, {
      user_id: user.user_id,
      regular_items: user.regular_items,
      equipment_items: null,
      consumable_items: null
    });
  });
  
  heistEquipUsers.forEach(user => {
    if (userMap.has(user.user_id)) {
      userMap.get(user.user_id).equipment_items = user.equipment_items;
    } else {
      userMap.set(user.user_id, {
        user_id: user.user_id,
        regular_items: null,
        equipment_items: user.equipment_items,
        consumable_items: null
      });
    }
  });
  
  heistConsUsers.forEach(user => {
    if (userMap.has(user.user_id)) {
      userMap.get(user.user_id).consumable_items = user.consumable_items;
    } else {
      userMap.set(user.user_id, {
        user_id: user.user_id,
        regular_items: null,
        equipment_items: null,
        consumable_items: user.consumable_items
      });
    }
  });
  
  return Array.from(userMap.values());
}

// Obtener inventario agrupado por item_id con cantidades
export async function getUserInventoryGrouped(userId) {
  const [rows] = await pool.query(`
    SELECT item_id, COUNT(*) as quantity, MIN(purchased_at) as first_purchase, MAX(purchased_at) as last_purchase
    FROM user_inventory 
    WHERE user_id = ? AND used_at IS NULL 
    GROUP BY item_id
    ORDER BY last_purchase DESC
  `, [userId]);
  
  return rows.reduce((acc, row) => {
    acc[row.item_id] = {
      quantity: Number(row.quantity),
      first_purchase: row.first_purchase,
      last_purchase: row.last_purchase
    };
    return acc;
  }, {});
}

// Activar un efecto temporal
export async function activateEffect(userId, itemId, effectType, effectValue, durationMs) {
  const endTime = new Date(Date.now() + durationMs);
  
  await pool.query(
    'INSERT INTO active_effects (user_id, effect_type, effect_value, end_time, source_item) VALUES (?, ?, ?, ?, ?)',
    [userId, effectType, effectValue, endTime, itemId]
  );
}

// Obtener efectos activos de un usuario
export async function getActiveEffects(userId) {
  // Limpiar efectos expirados primero
  await pool.query(
    'DELETE FROM active_effects WHERE end_time < NOW()'
  );
  
  const [rows] = await pool.query(
    'SELECT * FROM active_effects WHERE user_id = ? AND (end_time IS NULL OR end_time > NOW()) ORDER BY start_time DESC',
    [userId]
  );
  return rows;
}

// Obtener multiplicador total actual
export async function getCurrentMultiplier(userId) {
  const effects = await getActiveEffects(userId);
  let multiplier = 1.0;
  
  effects.forEach(effect => {
    if (effect.effect_type === 'earnings_multiplier') {
      multiplier *= effect.effect_value;
    }
  });
  
  return multiplier;
}

// Verificar si un usuario tiene un efecto específico activo
export async function hasActiveEffect(userId, effectType) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM active_effects WHERE user_id = ? AND effect_type = ? AND (end_time IS NULL OR end_time > NOW())',
    [userId, effectType]
  );
  return rows[0].count > 0;
}

// Marcar item como usado (para items consumibles)
export async function markItemAsUsed(userId, itemId) {
  // Marcar solo UNO de los items no usados (el más antiguo)
  await pool.query(
    'UPDATE user_inventory SET used_at = NOW() WHERE user_id = ? AND item_id = ? AND used_at IS NULL ORDER BY id LIMIT 1',
    [userId, itemId]
  );
}

// Marcar item específico como usado por su ID único
export async function markItemAsUsedById(dbId) {
  await pool.query(
    'UPDATE user_inventory SET used_at = NOW() WHERE id = ?',
    [dbId]
  );
}

// Eliminar item específico por su ID único
export async function removeItemFromInventoryById(dbId) {
  const [result] = await pool.query(
    'DELETE FROM user_inventory WHERE id = ?',
    [dbId]
  );
  return result.affectedRows > 0;
}

// Obtener capacidad de banco de un usuario (considerando mejoras)
export async function getUserBankCapacity(userId) {
  let baseCapacity = 100000; // Capacidad base del banco
  
  // Buscar items de banco que han sido usados (permanentes)
  const [rows] = await pool.query(
    'SELECT item_id, COUNT(*) as count FROM user_inventory WHERE user_id = ? AND used_at IS NOT NULL AND item_id IN (?, ?, ?) GROUP BY item_id',
    [userId, 'bank_upgrade_1', 'bank_upgrade_2', 'vault']
  );
  
  // Sumar capacidades de bank upgrades usados
  rows.forEach(row => {
    const count = row.count;
    switch (row.item_id) {
      case 'bank_upgrade_1':
        baseCapacity += 25000 * count;
        break;
      case 'bank_upgrade_2':
        baseCapacity += 100000 * count;
        break;
      case 'vault':
        baseCapacity += 500000 * count;
        break;
    }
  });
  return baseCapacity;
}

// Verificar si el usuario puede depositar cierta cantidad
export async function canDeposit(userId, amount) {
  const userBalances = await getUserBalances(userId);
  const bankCapacity = await getUserBankCapacity(userId);
  
  return (userBalances.bank + amount) <= bankCapacity;
}

// Resetear cooldowns de un usuario (para reset tokens)
export async function resetUserCooldowns(userId) {
  // Crear tabla de cooldowns si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_cooldowns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      command_name VARCHAR(50) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      UNIQUE KEY unique_user_command (user_id, command_name)
    )
  `);
  
  // Eliminar todos los cooldowns del usuario
  await pool.query(
    'DELETE FROM user_cooldowns WHERE user_id = ?',
    [userId]
  );
}

// Establecer garantía de victoria (para lucky tickets)
export async function setGuaranteedWin(userId) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guaranteed_wins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used BOOLEAN DEFAULT FALSE,
      UNIQUE KEY unique_user (user_id)
    )
  `);
  
  await pool.query(
    'INSERT INTO guaranteed_wins (user_id) VALUES (?) ON DUPLICATE KEY UPDATE used = FALSE, created_at = NOW()',
    [userId]
  );
}

// Verificar si el usuario tiene garantía de victoria
export async function hasGuaranteedWin(userId) {
  // Crear tabla si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guaranteed_wins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used BOOLEAN DEFAULT FALSE,
      UNIQUE KEY unique_user (user_id)
    )
  `);
  
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM guaranteed_wins WHERE user_id = ? AND used = FALSE',
    [userId]
  );
  return rows[0].count > 0;
}

// Usar garantía de victoria
export async function useGuaranteedWin(userId) {
  // Crear tabla si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guaranteed_wins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used BOOLEAN DEFAULT FALSE,
      UNIQUE KEY unique_user (user_id)
    )
  `);
  
  await pool.query(
    'UPDATE guaranteed_wins SET used = TRUE WHERE user_id = ?',
    [userId]
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎭 USER EFFECTS SYSTEM DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Ensure user effects table exists
export async function ensureUserEffectsTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS user_effects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(32) NOT NULL,
      effect_type VARCHAR(50) NOT NULL,
      effect_value DECIMAL(10,4) DEFAULT 1.0000,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_user_id (user_id),
      INDEX idx_effect_type (effect_type),
      INDEX idx_expires_at (expires_at)
    )`);
    console.log('✅ User effects table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating user effects table:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ MAINTENANCE SYSTEM DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Ensure maintenance table exists
export async function ensureMaintenanceTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS bot_maintenance (
      id INT PRIMARY KEY DEFAULT 1,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      reason TEXT DEFAULT NULL,
      start_time TIMESTAMP NULL,
      estimated_duration INT DEFAULT NULL,
      activated_by VARCHAR(20) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CHECK (id = 1)
    )`);
    
    // Insert default row if it doesn't exist
    await pool.query(`INSERT IGNORE INTO bot_maintenance (id, enabled) VALUES (1, FALSE)`);
    
    console.log('✅ Maintenance table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating maintenance table:', error);
  }
}

// Función para crear tabla de logs del bot
export async function ensureBotLogsTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS bot_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      level ENUM('error', 'warn', 'info', 'debug') NOT NULL DEFAULT 'info',
      category ENUM('system', 'command', 'security', 'database', 'error') NOT NULL DEFAULT 'system',
      command VARCHAR(50) NULL,
      user_id VARCHAR(20) NULL,
      username VARCHAR(100) NULL,
      server_id VARCHAR(20) NULL,
      server_name VARCHAR(100) NULL,
      channel_id VARCHAR(20) NULL,
      channel_name VARCHAR(100) NULL,
      message TEXT NOT NULL,
      data JSON NULL,
      error_stack TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      INDEX idx_level (level),
      INDEX idx_category (category),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at),
      INDEX idx_command (command)
    )`);
    
    console.log('✅ Bot logs table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating bot logs table:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🏴‍☠️ HEIST SYSTEM DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Función para crear tablas del sistema de heist
export async function ensureHeistTables() {
  try {
    console.log('🏴‍☠️ Creating heist system tables...');
    
    // Crear tabla para items de robo equipados
    await pool.query(`CREATE TABLE IF NOT EXISTS user_heist_equipment (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      item_type ENUM('lockpick_kit', 'hacking_laptop', 'stealth_suit', 'decoder_device', 'master_thief_kit') NOT NULL,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      uses_remaining INT DEFAULT -1,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY unique_user_item (user_id, item_type),
      INDEX idx_user_active (user_id, is_active),
      INDEX idx_expires_at (expires_at)
    )`);
    console.log('✅ user_heist_equipment table created');

    // Crear tabla para consumibles de robo
    await pool.query(`CREATE TABLE IF NOT EXISTS user_heist_consumables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      item_type ENUM('adrenaline_shot', 'focus_pills', 'intel_report', 'getaway_car', 'fake_id') NOT NULL,
      quantity INT DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY unique_user_consumable (user_id, item_type),
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    )`);
    console.log('✅ user_heist_consumables table created');

    // Crear tabla para historial de uso de items en robos
    await pool.query(`CREATE TABLE IF NOT EXISTS heist_item_usage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      bank_type ENUM('local', 'regional', 'national', 'reserve') NOT NULL,
      items_used JSON,
      success BOOLEAN NOT NULL,
      bonus_applied DECIMAL(4,3) DEFAULT 0.000,
      usage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_date (user_id, usage_date),
      INDEX idx_success (success)
    )`);
    console.log('✅ heist_item_usage table created');
    
    console.log('✅ All heist tables verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating heist tables:', error);
    console.error('Error details:', error.message);
    // Don't throw error to continue with other initializations
  }
}

// Función para crear tabla de cooldowns de trading crypto
export async function ensureCryptoTradingCooldownsTable() {
  try {
    console.log('⏰ Creating crypto trading cooldowns table...');
    
    await pool.query(`CREATE TABLE IF NOT EXISTS crypto_trading_cooldowns (
      user_id VARCHAR(20) PRIMARY KEY,
      last_trade TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_last_trade (last_trade)
    )`);
    
    console.log('✅ Crypto trading cooldowns table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating crypto trading cooldowns table:', error);
    console.error('Error details:', error.message);
    // Don't throw error to continue with other initializations
  }
}

// Get maintenance status
export async function getMaintenanceStatus() {
  try {
    const [rows] = await pool.query('SELECT * FROM bot_maintenance WHERE id = 1');
    if (rows.length === 0) {
      return {
        enabled: false,
        reason: null,
        startTime: null,
        estimatedDuration: null,
        activatedBy: null
      };
    }
    
    const row = rows[0];
    return {
      enabled: Boolean(row.enabled),
      reason: row.reason,
      startTime: row.start_time,
      estimatedDuration: row.estimated_duration,
      activatedBy: row.activated_by
    };
  } catch (error) {
    console.error('❌ Error getting maintenance status:', error);
    return { enabled: false, reason: null, startTime: null, estimatedDuration: null, activatedBy: null };
  }
}

// Set maintenance status
export async function setMaintenanceStatus(enabled, reason = null, estimatedDuration = null, activatedBy = null) {
  try {
    const startTime = enabled ? new Date() : null;
    
    await pool.query(`
      UPDATE bot_maintenance 
      SET enabled = ?, reason = ?, start_time = ?, estimated_duration = ?, activated_by = ?
      WHERE id = 1
    `, [enabled, reason, startTime, estimatedDuration, activatedBy]);
    
    return true;
  } catch (error) {
    console.error('❌ Error setting maintenance status:', error);
    return false;
  }
}

// Check if maintenance is enabled
export async function isMaintenanceEnabled() {
  try {
    const [rows] = await pool.query('SELECT enabled FROM bot_maintenance WHERE id = 1');
    return rows.length > 0 ? Boolean(rows[0].enabled) : false;
  } catch (error) {
    console.error('❌ Error checking maintenance status:', error);
    return false;
  }
}

// Disable maintenance (for automatic expiration)
export async function disableMaintenance() {
  try {
    await pool.query('UPDATE bot_maintenance SET enabled = FALSE WHERE id = 1');
    return true;
  } catch (error) {
    console.error('❌ Error disabling maintenance:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 💾 BACKUP SYSTEM - SERVER STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Crear tabla de backups si no existe
export async function ensureServerBackupsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_backups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      backup_id VARCHAR(64) UNIQUE,
      guild_id VARCHAR(32) NOT NULL,
      name VARCHAR(128),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      data JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// Guardar backup
export async function saveBackupToDb(backupData) {
  await ensureServerBackupsTable();
  
  // Generar backup_id único
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await pool.query(
      'INSERT INTO server_backups (backup_id, guild_id, name, data) VALUES (?, ?, ?, ?)',
      [backupId, backupData.guildId, backupData.name, JSON.stringify(backupData)]
    );
    console.log(`[BACKUP] Backup guardado exitosamente con ID: ${backupId}`);
    return backupId;
  } catch (error) {
    // Si el campo backup_id no existe, intentar sin él
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      await pool.query(
        'INSERT INTO server_backups (guild_id, name, data) VALUES (?, ?, ?)',
        [backupData.guildId, backupData.name, JSON.stringify(backupData)]
      );
      console.log(`[BACKUP] Backup guardado exitosamente (sin backup_id)`);
      return null;
    }
    throw error;
  }
}

// Listar últimos backups
export async function getLastBackups(guildId, limit = 10) {
  await ensureServerBackupsTable();
  const [rows] = await pool.query(
    'SELECT id, name, created_at, data FROM server_backups WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
    [guildId, limit]
  );
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    ...JSON.parse(row.data)
  }));
}

// Obtener y devolver backup por id
export async function restoreBackupFromDb(guildId, backupId) {
  await ensureServerBackupsTable();
  const [rows] = await pool.query(
    'SELECT id, name, created_at, data FROM server_backups WHERE guild_id = ? AND id = ? LIMIT 1',
    [guildId, backupId]
  );
  if (rows.length === 0) return null;
  return { id: rows[0].id, name: rows[0].name, createdAt: rows[0].created_at, ...JSON.parse(rows[0].data) };
}

// ═══════════════════════════════════════════════════════════════
// 📊 LEADERBOARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Get top N users by bank balance (descending)
export async function getTopBankBalances(limit = 10) {
  const [rows] = await pool.query('SELECT user_id, bank FROM users ORDER BY bank DESC LIMIT ?', [limit]);
  return rows.map(row => ({ userId: row.user_id, bank: Number(row.bank) }));
}

// Get top N users by hand balance (descending)
export async function getTopHandBalances(limit = 10) {
  const [rows] = await pool.query('SELECT user_id, hand FROM users ORDER BY hand DESC LIMIT ?', [limit]);
  return rows.map(row => ({ userId: row.user_id, hand: Number(row.hand) }));
}

// Get top N users by total balance (bank + hand) (descending)
export async function getTopUsers(limit = 10) {
  const [rows] = await pool.query('SELECT user_id, hand, bank, (hand + bank) as total FROM users ORDER BY total DESC LIMIT ?', [limit]);
  return rows.map(row => ({ 
    userId: row.user_id, 
    hand: Number(row.hand), 
    bank: Number(row.bank),
    total: Number(row.total)
  }));
}

// ═══════════════════════════════════════════════════════════════
// 🎯 REFERRAL SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generar código de referido único
function generateReferralCode() {
  const prefixes = ['FIRE', 'CASH', 'GOLD', 'LUCK', 'WIN', 'EPIC', 'MEGA', 'STAR', 'KING', 'BOSS'];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${randomPrefix}${randomNum}`;
}

// Crear usuario en sistema de referidos
export async function createReferralUser(userId) {
  try {
    // Verificar si ya existe
    const [existing] = await pool.query('SELECT user_id FROM referrals WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      return existing[0];
    }
    
    // Generar código único
    let referralCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      referralCode = generateReferralCode();
      const [existing] = await pool.query('SELECT referral_code FROM referrals WHERE referral_code = ?', [referralCode]);
      if (existing.length === 0) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Could not generate unique referral code');
    }
    
    // Insertar nuevo usuario
    await pool.query(
      'INSERT INTO referrals (user_id, referral_code) VALUES (?, ?)',
      [userId, referralCode]
    );
    
    return { user_id: userId, referral_code: referralCode };
  } catch (error) {
    console.error('Error creating referral user:', error);
    throw error;
  }
}

// Obtener información de referido de un usuario
export async function getReferralInfo(userId) {
  try {
    await createReferralUser(userId); // Crear si no existe
    
    const [rows] = await pool.query(`
      SELECT 
        user_id,
        referral_code,
        referred_by,
        referrals_count,
        total_earned,
        bonus_earned,
        last_referral_date,
        created_at
      FROM referrals 
      WHERE user_id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      throw new Error('Referral user not found');
    }
    
    return {
      userId: rows[0].user_id,
      referralCode: rows[0].referral_code,
      referredBy: rows[0].referred_by,
      referralsCount: Number(rows[0].referrals_count),
      totalEarned: Number(rows[0].total_earned),
      bonusEarned: Number(rows[0].bonus_earned),
      lastReferralDate: rows[0].last_referral_date,
      createdAt: rows[0].created_at
    };
  } catch (error) {
    console.error('Error getting referral info:', error);
    throw error;
  }
}

// Usar código de referido
export async function useReferralCode(userId, referralCode) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Verificar que el usuario no haya sido referido antes
    const [userCheck] = await connection.query('SELECT referred_by FROM referrals WHERE user_id = ?', [userId]);
    if (userCheck.length > 0 && userCheck[0].referred_by) {
      throw new Error('You have already been referred by someone else');
    }
    
    // Verificar que el código existe
    const [codeOwner] = await connection.query('SELECT user_id FROM referrals WHERE referral_code = ?', [referralCode]);
    if (codeOwner.length === 0) {
      throw new Error('Invalid referral code');
    }
    
    const referrerId = codeOwner[0].user_id;
    
    // Verificar que no está usando su propio código
    if (referrerId === userId) {
      throw new Error('You cannot use your own referral code');
    }
    
    // Crear usuario referido si no existe
    await createReferralUser(userId);
    
    // Actualizar usuario referido
    await connection.query(
      'UPDATE referrals SET referred_by = ? WHERE user_id = ?',
      [referrerId, userId]
    );
    
    // Actualizar contador del referidor y ganancias
    const referrerReward = config.referrals.rewards.referrer;
    await connection.query(`
      UPDATE referrals 
      SET 
        referrals_count = referrals_count + 1,
        total_earned = total_earned + ?,
        last_referral_date = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [referrerReward, referrerId]);
    
    // Dar dinero al referidor
    await addUserIfNotExists(referrerId);
    const referrerBalances = await getUserBalances(referrerId);
    await setUserBalances(referrerId, referrerBalances.hand + referrerReward, referrerBalances.bank);
    
    // Dar dinero al referido
    const referredReward = config.referrals.rewards.referee;
    await addUserIfNotExists(userId);
    const referredBalances = await getUserBalances(userId);
    await setUserBalances(userId, referredBalances.hand + referredReward, referredBalances.bank);
    
    // Verificar si el referidor alcanzó un nuevo milestone
    const [referrerInfo] = await connection.query('SELECT referrals_count FROM referrals WHERE user_id = ?', [referrerId]);
    const newCount = referrerInfo[0].referrals_count;
    
    const bonusAwarded = await checkAndAwardMilestoneBonus(referrerId, newCount, connection);
    
    await connection.commit();
    
    return {
      success: true,
      referrerId,
      referredId: userId,
      referrerEarned: config.referrals.rewards.referrer,
      referredEarned: config.referrals.rewards.referee,
      newReferralCount: newCount,
      bonusAwarded
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Verificar y otorgar bonus por milestone
async function checkAndAwardMilestoneBonus(userId, currentCount, connection) {
  const milestonesConfig = config.referrals.milestones;
  const milestoneBonus = milestonesConfig[currentCount];
  if (!milestoneBonus) {
    return null;
  }
  
  try {
    // Verificar si ya reclamó este milestone
    const [existing] = await connection.query(
      'SELECT id FROM referral_bonus_history WHERE user_id = ? AND milestone = ?',
      [userId, milestone.count]
    );
    
    if (existing.length > 0) {
      return null; // Ya reclamado
    }
    
    // Registrar el bonus
    await connection.query(
      'INSERT INTO referral_bonus_history (user_id, milestone, bonus_amount) VALUES (?, ?, ?)',
      [userId, milestone.count, milestone.bonus]
    );
    
    // Actualizar las ganancias del usuario
    await connection.query(
      'UPDATE referrals SET bonus_earned = bonus_earned + ?, total_earned = total_earned + ? WHERE user_id = ?',
      [milestoneBonus, milestoneBonus, userId]
    );
    
    // Dar el dinero al usuario
    const userBalances = await getUserBalances(userId);
    await setUserBalances(userId, userBalances.hand + milestoneBonus, userBalances.bank);
    
    return {
      milestone: currentCount,
      bonus: milestoneBonus
    };
  } catch (error) {
    console.error('Error awarding milestone bonus:', error);
    return null;
  }
}

// Obtener leaderboard de referidos
export async function getReferralLeaderboard(limit = 10) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        user_id,
        referral_code,
        referrals_count,
        total_earned
      FROM referrals 
      WHERE referrals_count > 0
      ORDER BY referrals_count DESC, total_earned DESC 
      LIMIT ?
    `, [limit]);
    
    return rows.map(row => ({
      userId: row.user_id,
      referralCode: row.referral_code,
      referralsCount: Number(row.referrals_count),
      totalEarned: Number(row.total_earned)
    }));
  } catch (error) {
    console.error('Error getting referral leaderboard:', error);
    throw error;
  }
}

// Get comprehensive leaderboard data with all balances
export async function getComprehensiveLeaderboard(limit = 10) {
  const [rows] = await pool.query('SELECT user_id, hand, bank, (hand + bank) as total FROM users ORDER BY total DESC LIMIT ?', [limit]);
  return rows.map(row => ({ 
    userId: row.user_id, 
    hand: Number(row.hand), 
    bank: Number(row.bank),
    total: Number(row.total)
  }));
}

// Get the actual number of tables in the database
export async function getDatabaseTableCount() {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    return rows.length;
  } catch (error) {
    console.error('Error counting database tables:', error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🤖 BOT STATUS SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Crear tablas del sistema de status si no existen
 */
export async function ensureBotStatusTables() {
  try {
    // Tabla para status del bot
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        type ENUM('PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'CUSTOM') DEFAULT 'CUSTOM',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_created (created_at)
      )
    `);

    // Tabla para configuración del sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_status_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_name VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Verificar si ya hay datos, si no insertar los predeterminados
    const [statusRows] = await pool.query('SELECT COUNT(*) as count FROM bot_status');
    if (statusRows[0].count === 0) {
      await pool.query(`
        INSERT INTO bot_status (text, type, is_active) VALUES
        ('Type /help for commands', 'CUSTOM', TRUE),
        ('Join the daily lottery!', 'CUSTOM', TRUE),
        ('Casino open 24/7!', 'CUSTOM', TRUE),
        ('Invest in Crypto /crypto!', 'CUSTOM', TRUE),
        ('Made by KayX with ❤️', 'CUSTOM', TRUE)
      `);
    }

    // Insertar configuración predeterminada
    await pool.query(`
      INSERT INTO bot_status_config (setting_name, setting_value) VALUES
      ('presenceUpdateInterval', '10000'),
      ('enabled', 'true')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);

    console.log('✅ Tablas del sistema de status verificadas');
  } catch (error) {
    console.error('❌ Error creando tablas del sistema de status:', error);
  }
}

/**
 * Obtener todos los status activos del bot
 */
export async function getActiveStatuses() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bot_status WHERE is_active = TRUE ORDER BY id ASC'
    );
    return rows;
  } catch (error) {
    console.error('Error obteniendo status activos:', error);
    return [];
  }
}

/**
 * Obtener configuración del sistema de status
 */
export async function getStatusConfig() {
  try {
    const [rows] = await pool.query('SELECT setting_name, setting_value FROM bot_status_config');
    const config = {};
    rows.forEach(row => {
      config[row.setting_name] = row.setting_value;
    });
    return config;
  } catch (error) {
    console.error('Error obteniendo configuración de status:', error);
    return {
      presenceUpdateInterval: '10000',
      enabled: 'true'
    };
  }
}

/**
 * Función genérica para ejecutar queries (usada por admin-status command)
 */
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}
