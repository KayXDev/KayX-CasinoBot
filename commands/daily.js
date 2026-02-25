// ═══════════════════════════════════════════════════════════════
// 📅 DAILY REWARDS COMMAND
// ═══════════════════════════════════════════════════════════════

import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { addUserIfNotExists, updateUserBalance, getUserBalance } from '../db.js';
import { checkJailStatus } from '../util/jailSystem.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('🎁 Claim your daily casino coin reward');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  
  // Verificar si el usuario está en la cárcel
  if (!(await checkJailStatus(userId, interaction, config))) {
    return;
  }
  
  await addUserIfNotExists(userId);

  // Verificar si las recompensas diarias están habilitadas
  if (!config.rewards.daily.enabled) {
    const disabledEmbed = new EmbedBuilder()
      .setTitle('❌ Daily Rewards Disabled')
      .setColor(0xff0000)
      .setDescription('**Daily rewards are temporarily disabled**\n\n🔧 *The administrator can enable them in the configuration*')
      .setFooter({ text: 'Casino Bot • Rewards System' })
      .setTimestamp();

    return interaction.reply({ embeds: [disabledEmbed], flags: MessageFlags.Ephemeral });
  }

  try {
    // Obtener datos del usuario desde la base de datos
    const userData = await getUserRewardData(userId);
    const now = new Date();
    const lastDaily = userData.last_daily ? new Date(userData.last_daily) : null;
    
    // Verificar cooldown
    if (lastDaily) {
      const cooldownMs = config.rewards.daily.cooldownHours * 60 * 60 * 1000;
      const timeSinceLastDaily = now.getTime() - lastDaily.getTime();
      
      if (timeSinceLastDaily < cooldownMs) {
        const remainingTime = cooldownMs - timeSinceLastDaily;
        const hoursRemaining = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        
        const cooldownEmbed = new EmbedBuilder()
          .setTitle('⏰ Daily Reward Not Available')
          .setColor(0xffa500)
          .setDescription('**You have already claimed your daily reward**\n\n🕐 *Come back later to claim the next one*')
          .addFields([
            {
              name: '⌛ Time Remaining',
              value: `\`\`\`🕐 ${hoursRemaining}h ${minutesRemaining}m\n🎁 Next reward available\n💰 Don't miss it!\`\`\``,
              inline: false
            }
          ])
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ 
            text: `Casino Bot • Next reward: ${new Date(lastDaily.getTime() + cooldownMs).toLocaleTimeString('en-US')}`,
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return interaction.reply({ embeds: [cooldownEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    // Calcular recompensa con números más variados y naturales
    const minAmount = config.rewards.daily.minAmount;
    const maxAmount = config.rewards.daily.maxAmount;
    
    // Generar número base aleatorio
    let baseReward = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    
    // Agregar variación para números más naturales
    const variation = Math.floor(Math.random() * 200) - 100; // -100 a +100
    baseReward = Math.max(minAmount, Math.min(maxAmount, baseReward + variation));
    
    // Redondear a números más naturales (terminados en diferentes dígitos)
    const roundingOptions = [1, 3, 7, 11, 13, 17, 19, 23, 27, 31, 37, 41, 43, 47];
    const roundingFactor = roundingOptions[Math.floor(Math.random() * roundingOptions.length)];
    baseReward = Math.floor(baseReward / 10) * 10 + roundingFactor;
    
    // Asegurar que esté en el rango válido
    baseReward = Math.max(minAmount, Math.min(maxAmount, baseReward));
    const finalReward = baseReward; // Sin multiplicadores
    
    // Calcular racha
    let streak = userData.daily_streak || 0;
    if (lastDaily) {
      const daysSinceLastDaily = Math.floor((now - lastDaily) / (1000 * 60 * 60 * 24));
      if (daysSinceLastDaily === 1) {
        streak += 1; // Continuar racha
      } else if (daysSinceLastDaily > 1) {
        streak = 1; // Reiniciar racha
      }
    } else {
      streak = 1; // Primera vez
    }

    // Actualizar base de datos
    await updateUserBalance(userId, finalReward);
    await updateRewardData(userId, 'daily', now, streak);
    
    // Log daily reward
    await logGamblingCommand(interaction.user, 'daily', {
      amount: `${finalReward} ${moneda}`,
      result: `CLAIMED - Day ${streak} streak`,
      additional: `Daily reward collected`
    });
    
    // Obtener balance actualizado
    const newBalance = await getUserBalance(userId);

    // Crear embed de recompensa
    const rewardEmbed = new EmbedBuilder()
      .setTitle('🎁 ¡Recompensa Diaria Reclamada!')
      .setColor(config.rewards.display.embedColor || 0x00ff00)
      .setDescription(`**Congratulations ${interaction.user.username}!**\n\n💰 *You have received your daily casino reward*`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields([
        {
          name: '💵 Reward Received',
          value: `\`\`\`💰 ${finalReward.toLocaleString()} coins\n🎯 Added to your account\n💎 Spend them wisely!\`\`\``,
          inline: true
        },
        {
          name: '👛 Updated Balance',
          value: `\`\`\`💳 ${newBalance.toLocaleString()} coins\n📈 Total balance\n🏦 Ready to gamble\`\`\``,
          inline: true
        },
        {
          name: '🔥 Daily Streak',
          value: `\`\`\`🎯 ${streak} consecutive day${streak !== 1 ? 's' : ''}\n⭐ Keep the streak!\n🎁 More days = more luck\`\`\``,
          inline: false
        }
      ]);



    // Información de próxima recompensa
    if (config.rewards.display.showNextAvailable) {
      const nextAvailable = new Date(now.getTime() + (config.rewards.daily.cooldownHours * 60 * 60 * 1000));
      rewardEmbed.addFields([
        {
          name: '⏰ Próxima Recompensa',
          value: `\`\`\`🕐 ${nextAvailable.toLocaleString('es-ES')}\n⌛ En ${config.rewards.daily.cooldownHours} horas\n🎁 ¡No te la pierdas!\`\`\``,
          inline: false
        }
      ]);
    }

    rewardEmbed.setFooter({ 
      text: 'Casino Bot • ¡Vuelve mañana por más recompensas!', 
      iconURL: interaction.client.user.displayAvatarURL() 
    });
    rewardEmbed.setTimestamp();

    if (config.rewards.display.enableAnimations) {
      rewardEmbed.setImage('https://i.imgur.com/dM3cp8k.gif'); // GIF de celebración
    }

    await interaction.reply({ embeds: [rewardEmbed] });

  } catch (error) {
    console.error('Error in daily command:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error del Sistema')
      .setColor(0xff0000)
      .setDescription('**Hubo un error al procesar tu recompensa diaria**\n\n🔧 *Por favor intenta nuevamente en unos momentos*')
      .setFooter({ text: 'Casino Bot • Sistema de Recompensas' });

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ FUNCIONES AUXILIARES
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