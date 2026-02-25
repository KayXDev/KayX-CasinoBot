import mysql from 'mysql2/promise';
import yaml from 'js-yaml';
import fs from 'fs';

// Leer configuración de base de datos
const configFile = fs.readFileSync('./config.yml', 'utf8');
const config = yaml.load(configFile);
const dbConfig = config.database;

// Crear conexión a la base de datos
const db = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ═══════════════════════════════════════════════════════════════
// 🛠️ DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════

// Función para crear la tabla de cooldowns si no existe
export async function ensureShopCooldownsTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_shop_cooldowns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        item_id VARCHAR(50) NOT NULL,
        last_purchase TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_item (user_id, item_id),
        INDEX idx_expires (expires_at),
        INDEX idx_user_id (user_id),
        INDEX idx_item_id (item_id),
        UNIQUE KEY unique_user_item (user_id, item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await db.execute(createTableQuery);
    console.log('✅ Shop cooldowns table verified/created successfully');
  } catch (error) {
    console.error('❌ Error creating shop cooldowns table:', error);
    throw error;
  }
}

// Funciones para el inventario
export async function addItemToInventory(userId, itemId, quantity = 1) {
  const query = `
    INSERT INTO user_inventory (user_id, item_id, quantity) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE quantity = quantity + ?
  `;
  await db.execute(query, [userId, itemId, quantity, quantity]);
}

export async function removeItemFromInventory(userId, itemId, quantity = 1) {
  const query = `
    UPDATE user_inventory 
    SET quantity = GREATEST(0, quantity - ?) 
    WHERE user_id = ? AND item_id = ?
  `;
  await db.execute(query, [quantity, userId, itemId]);
  
  // Eliminar items con cantidad 0
  const deleteQuery = `
    DELETE FROM user_inventory 
    WHERE user_id = ? AND item_id = ? AND quantity <= 0
  `;
  await db.execute(deleteQuery, [userId, itemId]);
}

export async function getUserInventory(userId) {
  const query = `
    SELECT item_id, quantity, expires_at, created_at 
    FROM user_inventory 
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `;
  const [rows] = await db.execute(query, [userId]);
  return rows;
}

export async function hasItem(userId, itemId, quantity = 1) {
  const query = `
    SELECT quantity 
    FROM user_inventory 
    WHERE user_id = ? AND item_id = ? AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const [rows] = await db.execute(query, [userId, itemId]);
  return rows.length > 0 && rows[0].quantity >= quantity;
}

// Funciones para efectos activos
export async function addUserEffect(userId, effectType, effectValue, expiresAt = null) {
  const query = `
    INSERT INTO user_effects (user_id, effect_type, effect_value, expires_at) 
    VALUES (?, ?, ?, ?)
  `;
  await db.execute(query, [userId, effectType, effectValue, expiresAt]);
}

export async function getUserEffects(userId) {
  const query = `
    SELECT effect_type, effect_value, expires_at, created_at 
    FROM user_effects 
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `;
  const [rows] = await db.execute(query, [userId]);
  return rows;
}

export async function removeExpiredEffects() {
  const query = `
    DELETE FROM user_effects 
    WHERE expires_at IS NOT NULL AND expires_at <= NOW()
  `;
  await db.execute(query);
}

export async function getUserEffect(userId, effectType) {
  const query = `
    SELECT SUM(effect_value) as total_value, COUNT(*) as count
    FROM user_effects 
    WHERE user_id = ? AND effect_type = ? AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const [rows] = await db.execute(query, [userId, effectType]);
  return rows[0];
}

export async function clearUserEffect(userId, effectType) {
  const query = `
    DELETE FROM user_effects 
    WHERE user_id = ? AND effect_type = ?
  `;
  await db.execute(query, [userId, effectType]);
}

// Funciones para límites de banco
export async function getUserBankLimit(userId) {
  const baseLimit = 50000; // Límite base
  const bankNoteEffects = await getUserEffect(userId, 'bank_limit');
  return baseLimit + (bankNoteEffects.total_value || 0);
}

export async function updateUserBankLimit(userId, additionalLimit) {
  // Esto se maneja automáticamente con los efectos
  await addUserEffect(userId, 'bank_limit', additionalLimit, null); // null = permanente
}

// Función para limpiar items expirados
export async function removeExpiredItems() {
  const query = `
    DELETE FROM user_inventory 
    WHERE expires_at IS NOT NULL AND expires_at <= NOW()
  `;
  await db.execute(query);
}

// ═══════════════════════════════════════════════════════════════
// 🛒 SHOP COOLDOWN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Función para verificar si un usuario puede comprar un item (cooldown)
export async function canPurchaseItem(userId, itemId) {
  const query = `
    SELECT expires_at 
    FROM user_shop_cooldowns 
    WHERE user_id = ? AND item_id = ? AND expires_at > NOW()
  `;
  const [rows] = await db.execute(query, [userId, itemId]);
  return rows.length === 0; // Puede comprar si no hay cooldown activo
}

// Función para obtener el tiempo restante de cooldown de un item
export async function getItemCooldownTimeLeft(userId, itemId) {
  const query = `
    SELECT expires_at 
    FROM user_shop_cooldowns 
    WHERE user_id = ? AND item_id = ? AND expires_at > NOW()
  `;
  const [rows] = await db.execute(query, [userId, itemId]);
  
  if (rows.length === 0) {
    return 0; // No hay cooldown
  }
  
  const now = new Date();
  const expiresAt = new Date(rows[0].expires_at);
  return Math.max(0, expiresAt.getTime() - now.getTime());
}

// Función para establecer cooldown después de una compra
export async function setPurchaseCooldown(userId, itemId, cooldownMs) {
  const expiresAt = new Date(Date.now() + cooldownMs);
  
  const query = `
    INSERT INTO user_shop_cooldowns (user_id, item_id, expires_at) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE 
      last_purchase = CURRENT_TIMESTAMP, 
      expires_at = VALUES(expires_at)
  `;
  
  await db.execute(query, [userId, itemId, expiresAt]);
}

// Función para obtener todos los cooldowns activos de un usuario
export async function getUserShopCooldowns(userId) {
  const query = `
    SELECT item_id, expires_at, last_purchase
    FROM user_shop_cooldowns 
    WHERE user_id = ? AND expires_at > NOW()
    ORDER BY expires_at ASC
  `;
  const [rows] = await db.execute(query, [userId]);
  return rows;
}

// Función para limpiar cooldowns expirados
export async function removeExpiredCooldowns() {
  const query = `
    DELETE FROM user_shop_cooldowns 
    WHERE expires_at <= NOW()
  `;
  const [result] = await db.execute(query);
  return result.affectedRows;
}

// Función para obtener la configuración de cooldown de un item
export function getItemCooldownConfig(itemId) {
  const cooldownConfig = config.shop_cooldowns;
  
  // Buscar en qué categoría está el item
  for (const [category, categoryData] of Object.entries(cooldownConfig)) {
    if (category === 'cooldown') continue; // Skip global cooldown
    
    if (categoryData.items && categoryData.items.includes(itemId)) {
      return {
        category: category,
        cooldown: categoryData.cooldown,
        items: categoryData.items
      };
    }
  }
  
  // Si no se encuentra, usar cooldown estándar (1 hora por defecto)
  return {
    category: 'standard',
    cooldown: 3600000, // 1 hour
    items: []
  };
}

// Función helper para formatear tiempo restante
export function formatTimeRemaining(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Limpiar automáticamente items, efectos y cooldowns expirados cada 30 minutos
setInterval(async () => {
  try {
    await removeExpiredItems();
    await removeExpiredEffects();
    const removedCooldowns = await removeExpiredCooldowns();
    console.log(`✅ Cleaned expired items, effects and ${removedCooldowns} cooldowns`);
  } catch (error) {
    console.error('❌ Error cleaning expired items/effects/cooldowns:', error);
  }
}, 30 * 60 * 1000); // 30 minutos