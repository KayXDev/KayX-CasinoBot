// ═══════════════════════════════════════════════════════════════
// 📅 WEEKLY REWARDS COMMAND
// ═══════════════════════════════════════════════════════════════

import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { addUserIfNotExists, updateUserBalance, getUserBalance } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('weekly')
  .setDescription('🎁 Claim your weekly casino coin reward');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  await addUserIfNotExists(userId);

  // Verificar si las recompensas semanales están habilitadas
  if (!config.rewards.weekly.enabled) {
    const disabledEmbed = new EmbedBuilder()
      .setTitle('❌ Weekly Rewards Disabled')
      .setColor(0xff0000)
      .setDescription('**Weekly rewards are temporarily disabled**\n\n🔧 *The administrator can enable them in the configuration*')
      .setFooter({ text: 'Casino Bot • Rewards System' })
      .setTimestamp();

    return interaction.reply({ embeds: [disabledEmbed], flags: MessageFlags.Ephemeral });
  }

  try {
    // Obtener datos del usuario desde la base de datos
    const userData = await getUserRewardData(userId);
    const now = new Date();
    const lastWeekly = userData.last_weekly ? new Date(userData.last_weekly) : null;
    
    // Verificar cooldown
    if (lastWeekly) {
      const cooldownMs = config.rewards.weekly.cooldownHours * 60 * 60 * 1000;
      const timeSinceLastWeekly = now.getTime() - lastWeekly.getTime();
      
      if (timeSinceLastWeekly < cooldownMs) {
        const remainingTime = cooldownMs - timeSinceLastWeekly;
        const daysRemaining = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        const cooldownEmbed = new EmbedBuilder()
          .setTitle('⏰ Weekly Reward Not Available')
          .setColor(0xffa500)
          .setDescription('**You have already claimed your weekly reward**\n\n🕐 *Come back next week to claim the next one*')
          .addFields([
            {
              name: '⌛ Time Remaining',
              value: `\`\`\`🗓️ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} ${hoursRemaining}h\n🎁 Next weekly reward\n💰 Worth the wait!\`\`\``,
              inline: false
            }
          ])
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ 
            text: `Casino Bot • Next reward: ${new Date(lastWeekly.getTime() + cooldownMs).toLocaleDateString('en-US')}`,
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return interaction.reply({ embeds: [cooldownEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    // Calcular recompensa con números más variados y naturales
    const minAmount = config.rewards.weekly.minAmount;
    const maxAmount = config.rewards.weekly.maxAmount;
    
    // Generar número base aleatorio
    let baseReward = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    
    // Agregar variación para números más naturales (más amplia para recompensas semanales)
    const variation = Math.floor(Math.random() * 1000) - 500; // -500 a +500
    baseReward = Math.max(minAmount, Math.min(maxAmount, baseReward + variation));
    
    // Para recompensas semanales, usar números más variados
    const roundingOptions = [
      7, 13, 17, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
      101, 107, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197
    ];
    const roundingFactor = roundingOptions[Math.floor(Math.random() * roundingOptions.length)];
    baseReward = Math.floor(baseReward / 100) * 100 + roundingFactor;
    
    // Asegurar que esté en el rango válido
    baseReward = Math.max(minAmount, Math.min(maxAmount, baseReward));
    const finalReward = baseReward; // Sin multiplicadores
    
    // Calcular racha
    let streak = userData.weekly_streak || 0;
    if (lastWeekly) {
      const weeksSinceLastWeekly = Math.floor((now - lastWeekly) / (1000 * 60 * 60 * 24 * 7));
      if (weeksSinceLastWeekly === 1) {
        streak += 1; // Continuar racha
      } else if (weeksSinceLastWeekly > 1) {
        streak = 1; // Reiniciar racha
      }
    } else {
      streak = 1; // Primera vez
    }

    // Bonus por racha semanal (bonus adicional por consistencia)
    let streakBonus = 0;
    if (streak >= 4) { // 1 mes consecutivo
      streakBonus = Math.floor(finalReward * 0.1); // 10% extra
    }
    if (streak >= 12) { // 3 meses consecutivos
      streakBonus = Math.floor(finalReward * 0.2); // 20% extra
    }

    const totalReward = finalReward + streakBonus;

    // Actualizar base de datos
    await updateUserBalance(userId, totalReward);
    await updateRewardData(userId, 'weekly', now, streak);
    
    // Log weekly reward
    await logGamblingCommand(interaction.user, 'weekly', {
      amount: `${totalReward} ${moneda}`,
      result: `CLAIMED - Week ${streak} streak`,
      additional: `Base: ${finalReward} | Streak bonus: ${streakBonus}`
    });
    
    // Obtener balance actualizado
    const newBalance = await getUserBalance(userId);

    // Crear embed de recompensa
    const rewardEmbed = new EmbedBuilder()
      .setTitle('🎊 Weekly Reward Claimed!')
      .setColor(config.rewards.display.embedColor || 0x00ff00)
      .setDescription(`**Amazing ${interaction.user.username}!**\n\n💎 *You have received your big weekly casino reward*`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields([
        {
          name: '💰 Weekly Reward',
          value: `\`\`\`💵 ${finalReward.toLocaleString()} coins${streakBonus > 0 ? `\n🔥 +${streakBonus.toLocaleString()} streak bonus` : ''}\n💎 A great sum!\`\`\``,
          inline: true
        },
        {
          name: '👛 Updated Balance',
          value: `\`\`\`💳 ${newBalance.toLocaleString()} coins\n📈 Total balance\n🏦 Ready for big bets!\`\`\``,
          inline: true
        },
        {
          name: '📅 Weekly Streak',
          value: `\`\`\`🎯 ${streak} consecutive week${streak !== 1 ? 's' : ''}\n⭐ Consistency rewarded!\n🏆 More weeks = more bonuses\`\`\``,
          inline: false
        }
      ]);



    if (streakBonus > 0) {
      rewardEmbed.addFields([
        {
          name: '🔥 Consistency Bonus',
          value: `\`\`\`🏆 ${streakBonus.toLocaleString()} extra coins\n📅 ${streak} consecutive weeks\n⭐ Loyalty reward!\`\`\``,
          inline: true
        }
      ]);
    }

    // Información de próxima recompensa
    if (config.rewards.display.showNextAvailable) {
      const nextAvailable = new Date(now.getTime() + (config.rewards.weekly.cooldownHours * 60 * 60 * 1000));
      rewardEmbed.addFields([
        {
          name: '⏰ Next Weekly Reward',
          value: `\`\`\`🗓️ ${nextAvailable.toLocaleDateString('en-US')}\n⌛ In 7 days\n🎁 It will be even better!\`\`\``,
          inline: false
        }
      ]);
    }

    // Mensaje especial por hitos
    if (streak === 1) {
      rewardEmbed.addFields([
        {
          name: '🎉 ¡Bienvenido al Sistema Semanal!',
          value: `\`\`\`🆕 Primera recompensa semanal\n🎯 Vuelve cada semana\n💰 Las recompensas aumentan\`\`\``,
          inline: false
        }
      ]);
    } else if (streak === 4) {
      rewardEmbed.addFields([
        {
          name: '🏆 ¡Hito Alcanzado!',
          value: `\`\`\`🗓️ 1 mes de consistencia\n💎 Bonus permanente desbloqueado\n⭐ ¡Eres un jugador dedicado!\`\`\``,
          inline: false
        }
      ]);
    } else if (streak === 12) {
      rewardEmbed.addFields([
        {
          name: '👑 Legendary Player!',
          value: `\`\`\`🏆 3 consecutive months\n💰 Maximum bonus unlocked\n🌟 You're a casino legend!\`\`\``,
          inline: false
        }
      ]);
    }

    rewardEmbed.setFooter({ 
      text: 'Casino Bot • Come back next week for more rewards!', 
      iconURL: interaction.client.user.displayAvatarURL() 
    });
    rewardEmbed.setTimestamp();

    if (config.rewards.display.enableAnimations) {
      rewardEmbed.setImage('https://i.imgur.com/XOX4LvH.gif'); // GIF de celebración semanal
    }

    await interaction.reply({ embeds: [rewardEmbed] });

  } catch (error) {
    console.error('Error in weekly command:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error del Sistema')
      .setColor(0xff0000)
      .setDescription('**Hubo un error al procesar tu recompensa semanal**\n\n🔧 *Por favor intenta nuevamente en unos momentos*')
      .setFooter({ text: 'Casino Bot • Sistema de Recompensas' });

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ FUNCIONES AUXILIARES (COMPARTIDAS CON DAILY.JS)
// ═══════════════════════════════════════════════════════════════

async function getUserRewardData(userId) {
  const { pool } = await import('../db.js');
  
  try {
    const [results] = await pool.query(`
      SELECT last_daily, last_weekly, daily_streak, weekly_streak 
      FROM users 
      WHERE user_id = ?
    `, [userId]);
    
    return results[0] || {};
  } catch (error) {
    console.error('Error getting user reward data:', error);
    throw error;
  }
}

async function updateRewardData(userId, rewardType, timestamp, streak) {
  const { pool } = await import('../db.js');
  
  const columnMap = {
    daily: 'last_daily',
    weekly: 'last_weekly'
  };
  
  const streakColumnMap = {
    daily: 'daily_streak', 
    weekly: 'weekly_streak'
  };
  
  const timeColumn = columnMap[rewardType];
  const streakColumn = streakColumnMap[rewardType];
  
  if (!timeColumn || !streakColumn) {
    throw new Error('Invalid reward type');
  }
  
  try {
    const [results] = await pool.query(`
      UPDATE users 
      SET ${timeColumn} = ?, ${streakColumn} = ?
      WHERE user_id = ?
    `, [timestamp, streak, userId]);
    
    return results;
  } catch (error) {
    console.error('Error updating reward data:', error);
    throw error;
  }
}