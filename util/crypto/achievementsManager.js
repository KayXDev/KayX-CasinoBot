// ═══════════════════════════════════════════════════════════════
// 🏆 CRYPTO ACHIEVEMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import yaml from 'js-yaml';
import fs from 'fs';
import { updateUserBalance } from '../../db.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

class CryptoAchievementsManager {
  constructor() {
    this.db = null;
    this.achievementTypes = config.crypto?.achievements?.types || {};
  }

  // Inicializar con conexión a BD
  async initialize(database) {
    this.db = database;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎯 CORE ACHIEVEMENT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // Crear achievement para un usuario si no existe
  async createAchievementIfNotExists(userId, achievementType) {
    const achievement = this.achievementTypes[achievementType];
    if (!achievement) return;

    try {
      await this.db.execute(`
        INSERT IGNORE INTO crypto_achievements 
        (user_id, achievement_type, achievement_name, description, progress_required, reward_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userId,
        achievementType,
        achievement.name,
        achievement.description,
        achievement.progressRequired || 1,
        achievement.reward || 0
      ]);
    } catch (error) {
      console.error('Error creating achievement:', error);
    }
  }

  // Actualizar progreso de un achievement
  async updateAchievementProgress(userId, achievementType, newProgress, additionalData = {}) {
    await this.createAchievementIfNotExists(userId, achievementType);

    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM crypto_achievements 
        WHERE user_id = ? AND achievement_type = ? AND is_completed = FALSE
      `, [userId, achievementType]);

      if (rows.length === 0) return; // Ya completado o no existe

      const achievement = rows[0];
      const progressRequired = achievement.progress_required;
      const isNowCompleted = newProgress >= progressRequired;

      if (isNowCompleted && !achievement.is_completed) {
        // ¡Achievement desbloqueado!
        await this.db.execute(`
          UPDATE crypto_achievements 
          SET progress_current = ?, is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND achievement_type = ?
        `, [newProgress, userId, achievementType]);

        // Dar recompensa
        if (achievement.reward_amount > 0) {
          await updateUserBalance(userId, achievement.reward_amount);
        }

        // Registrar en el historial de achievements
        await this.recordAchievementInHistory(userId, achievementType, achievement, additionalData);

        return {
          unlocked: true,
          achievement: {
            type: achievementType,
            name: achievement.achievement_name,
            description: achievement.description,
            reward: achievement.reward_amount,
            ...additionalData
          }
        };
      } else {
        // Solo actualizar progreso
        await this.db.execute(`
          UPDATE crypto_achievements 
          SET progress_current = ?
          WHERE user_id = ? AND achievement_type = ?
        `, [newProgress, userId, achievementType]);
      }

      return { unlocked: false };
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      return { unlocked: false };
    }
  }

  // Registrar achievement completado en el historial
  async recordAchievementInHistory(userId, achievementType, achievement, additionalData = {}) {
    try {
      // Obtener datos adicionales del contexto
      const portfolioValue = additionalData.portfolioValue || null;
      const totalTrades = additionalData.totalTrades || null;
      const cryptoOwned = additionalData.cryptosOwned ? JSON.stringify(additionalData.cryptosOwned) : null;
      const marketEvent = additionalData.marketEvent || null;

      await this.db.execute(`
        INSERT IGNORE INTO user_achievements 
        (user_id, achievement_type, achievement_name, achievement_description, reward_amount, 
         portfolio_value, total_trades, crypto_owned, market_event)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        achievementType,
        achievement.achievement_name,
        achievement.description,
        achievement.reward_amount,
        portfolioValue,
        totalTrades,
        cryptoOwned,
        marketEvent
      ]);

      console.log(`🏆 Achievement recorded: ${achievement.achievement_name} for user ${userId}`);
    } catch (error) {
      console.error('Error recording achievement in history:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 TRACKING FUNCTIONS (Se llaman desde las acciones del usuario)
  // ═══════════════════════════════════════════════════════════════

  // Cuando usuario hace su primera compra
  async checkFirstBuy(userId) {
    return await this.updateAchievementProgress(userId, 'first_buy', 1);
  }

  // Cuando usuario hace un trade (para day_trader)
  async checkDayTrader(userId) {
    const today = new Date().toDateString();
    
    try {
      // Contar trades de hoy
      const [rows] = await this.db.execute(`
        SELECT COUNT(*) as trade_count 
        FROM crypto_transactions 
        WHERE user_id = ? AND DATE(created_at) = CURDATE()
      `, [userId]);

      const todayTrades = rows[0].trade_count;
      return await this.updateAchievementProgress(userId, 'day_trader', todayTrades);
    } catch (error) {
      console.error('Error checking day trader:', error);
      return { unlocked: false };
    }
  }

  // Cuando cambia el portfolio (para whale_status y portfolio_master)
  async checkPortfolioAchievements(userId) {
    try {
      // Calcular valor total del portfolio
      const [portfolioRows] = await this.db.execute(`
        SELECT 
          p.crypto_id,
          p.amount,
          c.current_price,
          (p.amount * c.current_price) as value
        FROM crypto_portfolio p
        JOIN casino_cryptos c ON p.crypto_id = c.id
        WHERE p.user_id = ? AND p.amount > 0
      `, [userId]);

      const totalValue = portfolioRows.reduce((sum, row) => sum + parseFloat(row.value), 0);
      const uniqueCryptos = portfolioRows.length;
      const totalAvailableCryptos = 4; // BTC, ETH, BNB, SOL

      const results = [];

      // Check whale status (portfolio > 100,000)
      if (totalValue >= 100000) {
        const whaleResult = await this.updateAchievementProgress(userId, 'whale_status', 1, {
          portfolioValue: totalValue
        });
        if (whaleResult.unlocked) results.push(whaleResult);
      }

      // Check portfolio master (tiene todas las cryptos)
      if (uniqueCryptos >= totalAvailableCryptos) {
        const masterResult = await this.updateAchievementProgress(userId, 'portfolio_master', 1, {
          cryptosOwned: uniqueCryptos,
          totalCryptos: totalAvailableCryptos
        });
        if (masterResult.unlocked) results.push(masterResult);
      }

      return results;
    } catch (error) {
      console.error('Error checking portfolio achievements:', error);
      return [];
    }
  }

  // Cuando usuario hace una compra durante un crash (perfect_timing)
  async checkPerfectTiming(userId, cryptoId, currentMarketEvents) {
    // Verificar si hay un crash activo que afecte a esta crypto
    const isCrashActive = currentMarketEvents.some(event => 
      event.event_type === 'flash_crash' || 
      event.event_type.includes('crash') ||
      event.price_impact < -10 // Cualquier evento con -10% o más
    );

    if (isCrashActive) {
      return await this.updateAchievementProgress(userId, 'perfect_timing', 1, {
        cryptoId,
        timing: 'crash_bottom'
      });
    }

    return { unlocked: false };
  }

  // Check diamond hands (mantener posición por 7+ días)
  async checkDiamondHands(userId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Buscar holdings que no se hayan tocado en 7+ días
      const [rows] = await this.db.execute(`
        SELECT COUNT(*) as old_holdings
        FROM crypto_portfolio p
        WHERE p.user_id = ? 
        AND p.amount > 0
        AND p.last_activity <= ?
      `, [userId, sevenDaysAgo.toISOString().slice(0, 19).replace('T', ' ')]);

      const oldHoldings = rows[0].old_holdings;
      if (oldHoldings > 0) {
        return await this.updateAchievementProgress(userId, 'diamond_hands', 1, {
          holdingDays: 7,
          positions: oldHoldings
        });
      }

      return { unlocked: false };
    } catch (error) {
      console.error('Error checking diamond hands:', error);
      return { unlocked: false };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📋 QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // Obtener todos los achievements de un usuario
  async getUserAchievements(userId) {
    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM crypto_achievements 
        WHERE user_id = ?
        ORDER BY is_completed DESC, created_at ASC
      `, [userId]);

      return rows.map(row => ({
        ...row,
        progress_percentage: Math.min(100, (row.progress_current / row.progress_required) * 100)
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  // Obtener achievements completados recientemente (últimas 24h)
  async getRecentCompletedAchievements(userId) {
    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM crypto_achievements 
        WHERE user_id = ? AND is_completed = TRUE
        AND completed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY completed_at DESC
      `, [userId]);

      return rows;
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  // Estadísticas globales de achievements
  async getAchievementStats() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          achievement_type,
          achievement_name,
          COUNT(*) as total_users,
          SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed_count,
          AVG(progress_current / progress_required * 100) as avg_progress
        FROM crypto_achievements
        GROUP BY achievement_type, achievement_name
        ORDER BY completed_count DESC
      `);

      return rows;
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📋 ACHIEVEMENT HISTORY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // Obtener historial de achievements de un usuario
  async getUserAchievementHistory(userId, limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM user_achievements 
        WHERE user_id = ? 
        ORDER BY unlocked_at DESC 
        LIMIT ?
      `, [userId, limit]);

      return rows;
    } catch (error) {
      console.error('Error getting user achievement history:', error);
      return [];
    }
  }

  // Obtener estadísticas de achievements de un usuario
  async getUserAchievementStats(userId) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          COUNT(*) as total_achievements,
          SUM(reward_amount) as total_rewards_earned,
          MIN(unlocked_at) as first_achievement,
          MAX(unlocked_at) as latest_achievement
        FROM user_achievements 
        WHERE user_id = ?
      `, [userId]);

      return rows[0] || {
        total_achievements: 0,
        total_rewards_earned: 0,
        first_achievement: null,
        latest_achievement: null
      };
    } catch (error) {
      console.error('Error getting user achievement stats:', error);
      return {
        total_achievements: 0,
        total_rewards_earned: 0,
        first_achievement: null,
        latest_achievement: null
      };
    }
  }

  // Obtener top achievements recientes (para mostrar en canales)
  async getRecentAchievements(limit = 5) {
    try {
      const [rows] = await this.db.execute(`
        SELECT user_id, achievement_name, achievement_description, reward_amount, unlocked_at
        FROM user_achievements 
        ORDER BY unlocked_at DESC 
        LIMIT ?
      `, [limit]);

      return rows;
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  // Obtener leaderboard de achievements
  async getAchievementLeaderboard(limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          user_id,
          COUNT(*) as total_achievements,
          SUM(reward_amount) as total_rewards,
          MAX(unlocked_at) as latest_achievement
        FROM user_achievements 
        GROUP BY user_id 
        ORDER BY total_achievements DESC, total_rewards DESC
        LIMIT ?
      `, [limit]);

      return rows;
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error);
      return [];
    }
  }

  // Verificar si un usuario tiene un achievement específico
  async hasUserUnlockedAchievement(userId, achievementType) {
    try {
      const [rows] = await this.db.execute(`
        SELECT id FROM user_achievements 
        WHERE user_id = ? AND achievement_type = ?
        LIMIT 1
      `, [userId, achievementType]);

      return rows.length > 0;
    } catch (error) {
      console.error('Error checking if user has achievement:', error);
      return false;
    }
  }
}

// Instancia singleton
const achievementsManager = new CryptoAchievementsManager();

export default achievementsManager;