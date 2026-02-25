// Devuelve el timestamp del último trade del usuario
export async function getLastUserTradeTimestamp(userId) {
  const [rows] = await pool.execute(
    `SELECT MAX(created_at) as lastTrade FROM crypto_transactions WHERE user_id = ?`,
    [userId]
  );
  if (rows.length > 0 && rows[0].lastTrade) {
    return new Date(rows[0].lastTrade).getTime();
  }
  return null;
}
// cryptoDailyTrades.js
// Utilidad para controlar el número de trades diarios por usuario

import { pool } from '../../db.js';


// Obtiene el número de trades realizados hoy por el usuario
export async function getUserDailyTradeCount(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as tradeCount FROM crypto_transactions 
     WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
    [userId]
  );
  return rows[0]?.tradeCount || 0;
}

// Obtiene el timestamp del último trade (cooldown) desde la base de datos
export async function getUserTradeCooldown(userId) {
  const [rows] = await pool.execute(
    'SELECT last_trade FROM crypto_trading_cooldowns WHERE user_id = ?',
    [userId]
  );
  if (rows.length > 0) {
    return new Date(rows[0].last_trade).getTime();
  }
  return null;
}

// Actualiza el timestamp del último trade (cooldown) en la base de datos
export async function setUserTradeCooldown(userId, timestamp) {
  await pool.execute(
    'INSERT INTO crypto_trading_cooldowns (user_id, last_trade) VALUES (?, FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE last_trade = FROM_UNIXTIME(?)',
    [userId, Math.floor(timestamp / 1000), Math.floor(timestamp / 1000)]
  );
}

// Resetea el cooldown de trading en la base de datos
export async function resetUserTradeCooldown(userId) {
  await pool.execute(
    'DELETE FROM crypto_trading_cooldowns WHERE user_id = ?',
    [userId]
  );
}

// Incrementar el contador de trades diarios (opcional, si se requiere lógica adicional)
// En este caso, el registro en crypto_transactions ya actúa como fuente de la verdad

// Reset diario no necesario, ya que la consulta filtra por fecha actual
