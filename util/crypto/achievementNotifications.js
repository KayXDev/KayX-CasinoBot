// ═══════════════════════════════════════════════════════════════
// 🏆 CRYPTO ACHIEVEMENT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

/**
 * Crear embed de notificación para achievement desbloqueado
 * @param {Object} achievement - Datos del achievement
 * @param {Object} user - Usuario de Discord
 * @param {string} moneda - Emoji de moneda del casino
 */
export function createAchievementNotification(achievement, user, moneda = '💰') {
  const embed = new EmbedBuilder()
    .setTitle('🏆 ¡ACHIEVEMENT DESBLOQUEADO!')
    .setColor(0xFFD700) // Gold color
    .setDescription(`**${user.username}** ha completado un nuevo logro!`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: '🎯 Achievement',
        value: `**${achievement.name}**`,
        inline: true
      },
      {
        name: '📝 Descripción',
        value: achievement.description,
        inline: true
      },
      {
        name: '💰 Recompensa',
        value: `**+${achievement.reward.toLocaleString()} ${moneda}**`,
        inline: true
      }
    )
    .setFooter({
      text: 'Crypto Exchange • Achievement System',
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();

  // Añadir información adicional según el tipo de achievement
  if (achievement.portfolioValue) {
    embed.addFields({
      name: '📊 Portfolio Value',
      value: `${achievement.portfolioValue.toLocaleString()} ${moneda}`,
      inline: true
    });
  }

  if (achievement.cryptosOwned) {
    embed.addFields({
      name: '📈 Cryptos Owned',
      value: `${achievement.cryptosOwned}/${achievement.totalCryptos}`,
      inline: true
    });
  }

  if (achievement.timing) {
    embed.addFields({
      name: '⏰ Perfect Timing',
      value: `Bought during ${achievement.timing}!`,
      inline: true
    });
  }

  return embed;
}

/**
 * Enviar notificación de achievement directamente al usuario
 * @param {Object} user - Usuario de Discord
 * @param {Object} achievement - Datos del achievement
 * @param {string} moneda - Emoji de moneda
 */
export async function sendAchievementNotification(user, achievement, moneda = '💰') {
  try {
    const embed = createAchievementNotification(achievement, user, moneda);
    
    // Enviar mensaje directo al usuario
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending achievement notification to user:', error);
    // Si falla el DM, no hacer nada (el usuario podría tener DMs cerrados)
  }
}

/**
 * Crear embed de progreso de achievements para mostrar en comandos
 * @param {Array} achievements - Lista de achievements del usuario
 * @param {Object} user - Usuario de Discord
 * @param {string} moneda - Emoji de moneda
 */
export function createAchievementProgressEmbed(achievements, user, moneda = '💰') {
  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${user.username}'s Crypto Achievements`)
    .setColor(0x3498DB)
    .setDescription('**Progreso de logros del sistema de trading crypto**\n\n*Completa desafíos para ganar recompensas exclusivas*')
    .setThumbnail(user.displayAvatarURL());

  const completed = achievements.filter(a => a.is_completed);
  const inProgress = achievements.filter(a => !a.is_completed);
  const totalRewards = completed.reduce((sum, a) => sum + parseFloat(a.reward_amount || 0), 0);

  // Estadísticas generales
  embed.addFields({
    name: '📊 Estadísticas Generales',
    value: `\`\`\`yaml
✅ Completados: ${completed.length}/${achievements.length}
🎯 En progreso: ${inProgress.length}
💰 Recompensas ganadas: ${totalRewards.toLocaleString()} ${moneda}\`\`\``,
    inline: false
  });

  // Achievements completados
  if (completed.length > 0) {
    let completedText = '';
    completed.forEach(achievement => {
      const completedDate = new Date(achievement.completed_at).toLocaleDateString('es-ES');
      completedText += `✅ **${achievement.achievement_name}**\n`;
      completedText += `   └ Completado: ${completedDate}\n`;
      completedText += `   └ Recompensa: ${parseFloat(achievement.reward_amount).toLocaleString()} ${moneda}\n\n`;
    });

    embed.addFields({
      name: '🏆 Achievements Completados',
      value: completedText.slice(0, 1024), // Discord limit
      inline: false
    });
  }

  // Achievements en progreso
  if (inProgress.length > 0) {
    let progressText = '';
    inProgress.forEach(achievement => {
      const progressPercent = Math.round((achievement.progress_current / achievement.progress_required) * 100);
      const progressBar = createProgressBar(progressPercent);
      
      progressText += `🎯 **${achievement.achievement_name}**\n`;
      progressText += `   └ ${achievement.description}\n`;
      progressText += `   └ ${progressBar} ${progressPercent}%\n`;
      progressText += `   └ Progreso: ${achievement.progress_current}/${achievement.progress_required}\n`;
      progressText += `   └ Recompensa: ${parseFloat(achievement.reward_amount).toLocaleString()} ${moneda}\n\n`;
    });

    embed.addFields({
      name: '🎯 En Progreso',
      value: progressText.slice(0, 1024), // Discord limit
      inline: false
    });
  }

  embed.setFooter({
    text: 'Crypto Exchange • Usa /crypto buy, /crypto sell para progresar',
    iconURL: 'https://i.imgur.com/hMwxvcd.png'
  }).setTimestamp();

  return embed;
}

/**
 * Crear barra de progreso visual
 * @param {number} percentage - Porcentaje de progreso (0-100)
 */
function createProgressBar(percentage) {
  const barLength = 10;
  const filledBars = Math.round((percentage / 100) * barLength);
  const emptyBars = barLength - filledBars;
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

/**
 * Crear embed de anuncio público para achievement
 * @param {Object} achievement - Datos del achievement
 * @param {Object} user - Usuario de Discord
 * @param {Object} userStats - Estadísticas adicionales del usuario
 * @param {string} moneda - Emoji de moneda
 */
export function createPublicAchievementEmbed(achievement, user, userStats = {}, moneda = '💰') {
  const announceConfig = config.crypto?.achievements?.announcements || {};
  const celebrationLevel = announceConfig.celebrationLevel || 'medium';
  
  // Emojis según nivel de celebración
  const celebrations = {
    low: '🎯',
    medium: '🎉',
    high: '🎊🏆🎉'
  };

  const celebrationEmoji = celebrations[celebrationLevel] || '🎉';
  
  const embed = new EmbedBuilder()
    .setTitle(`${celebrationEmoji} ¡NUEVO ACHIEVEMENT DESBLOQUEADO! ${celebrationEmoji}`)
    .setColor(0xFFD700) // Gold color
    .setDescription(`**${user.username}** ha completado un logro épico en el Crypto Exchange!`)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .addFields(
      {
        name: '🏆 Achievement Conseguido',
        value: `**${achievement.name}**`,
        inline: true
      },
      {
        name: '📝 Descripción',
        value: achievement.description,
        inline: true
      },
      {
        name: '💰 Recompensa Ganada',
        value: `**+${achievement.reward.toLocaleString()} ${moneda}**`,
        inline: true
      }
    );

  // Añadir información específica del achievement
  if (achievement.portfolioValue) {
    embed.addFields({
      name: '💎 Valor del Portfolio',
      value: `${achievement.portfolioValue.toLocaleString()} ${moneda}`,
      inline: true
    });
  }

  if (achievement.cryptosOwned && achievement.totalCryptos) {
    embed.addFields({
      name: '📈 Cryptos Poseídas',
      value: `${achievement.cryptosOwned}/${achievement.totalCryptos} (¡Colección completa!)`,
      inline: true
    });
  }

  // Mostrar estadísticas del usuario si está habilitado
  if (announceConfig.showUserStats && userStats) {
    let statsText = '';
    
    if (userStats.totalTrades) {
      statsText += `🔄 **Trades totales:** ${userStats.totalTrades}\n`;
    }
    
    if (userStats.totalInvested) {
      statsText += `💰 **Invertido total:** ${userStats.totalInvested.toLocaleString()} ${moneda}\n`;
    }
    
    if (userStats.completedAchievements) {
      statsText += `🏆 **Achievements completados:** ${userStats.completedAchievements}/8\n`;
    }

    if (statsText) {
      embed.addFields({
        name: '📊 Estadísticas del Trader',
        value: statsText,
        inline: false
      });
    }
  }

  embed
    .setFooter({
      text: 'Casino Crypto Exchange • ¡Usa /crypto achievements para ver tu progreso!',
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();

  return embed;
}

/**
 * Enviar anuncio público de achievement
 * @param {Object} client - Cliente de Discord
 * @param {Object} achievement - Datos del achievement
 * @param {Object} user - Usuario de Discord
 * @param {string} moneda - Emoji de moneda
 */
export async function sendPublicAchievementAnnouncement(client, achievement, user, moneda = '💰') {
  try {
    const announceConfig = config.crypto?.achievements?.announcements || {};
    
    // Verificar si los anuncios están habilitados
    if (!announceConfig.enabled || !announceConfig.channelId) {
      return;
    }

    // Verificar si este achievement debe ser anunciado
    if (!announceConfig.announceAll) {
      const importantAchievements = announceConfig.importantAchievements || [];
      if (!importantAchievements.includes(achievement.type)) {
        return;
      }
    }

    // Obtener el canal
    const channel = await client.channels.fetch(announceConfig.channelId).catch(() => null);
    if (!channel) {
      console.error('Achievement announcement channel not found:', announceConfig.channelId);
      return;
    }

    // Obtener estadísticas del usuario para el anuncio
    const userStats = await getUserStatsForAnnouncement(user.id);
    
    // Crear embed público
    const publicEmbed = createPublicAchievementEmbed(achievement, user, userStats, moneda);
    
    // Enviar al canal
    await channel.send({ embeds: [publicEmbed] });
    
  } catch (error) {
    console.error('Error sending public achievement announcement:', error);
  }
}

/**
 * Obtener estadísticas del usuario para anuncios
 * @param {string} userId - ID del usuario
 */
async function getUserStatsForAnnouncement(userId) {
  try {
    const { pool } = await import('../../db.js');
    
    // Obtener número de trades totales
    const [tradeRows] = await pool.execute(
      'SELECT COUNT(*) as total_trades, COALESCE(SUM(total_value), 0) as total_invested FROM crypto_transactions WHERE user_id = ?',
      [userId]
    );
    
    // Obtener achievements completados
    const [achievementRows] = await pool.execute(
      'SELECT COUNT(*) as completed_achievements FROM crypto_achievements WHERE user_id = ? AND is_completed = TRUE',
      [userId]
    );
    
    return {
      totalTrades: tradeRows[0]?.total_trades || 0,
      totalInvested: parseFloat(tradeRows[0]?.total_invested || 0),
      completedAchievements: achievementRows[0]?.completed_achievements || 0
    };
  } catch (error) {
    console.error('Error getting user stats for announcement:', error);
    return {};
  }
}

/**
 * Procesar y enviar notificaciones de múltiples achievements
 * @param {Object} client - Cliente de Discord
 * @param {Object} user - Usuario de Discord
 * @param {Array} achievementResults - Array de resultados de achievements
 * @param {string} moneda - Emoji de moneda
 */
export async function processAchievementResults(client, user, achievementResults, moneda = '💰') {
  for (const result of achievementResults) {
    if (result && result.unlocked) {
      // Enviar notificación personal (DM al usuario)
      await sendAchievementNotification(user, result.achievement, moneda);
      
      // Enviar anuncio público
      await sendPublicAchievementAnnouncement(client, result.achievement, user, moneda);
      
      // Pequeña pausa entre notificaciones para evitar spam
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}