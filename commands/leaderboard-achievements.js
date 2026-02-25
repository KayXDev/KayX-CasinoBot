// ═══════════════════════════════════════════════════════════════
// 🏆 CRYPTO ACHIEVEMENTS LEADERBOARD COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import achievementsManager from '../util/crypto/achievementsManager.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logGamblingCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('leaderboard-achievements')
  .setDescription('🏆 Ver el ranking de achievements crypto')
  .addSubcommand(subcommand =>
    subcommand
      .setName('top')
      .setDescription('Top usuarios con más achievements')
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Número de usuarios a mostrar (máximo 20)')
          .setMinValue(5)
          .setMaxValue(20)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('recent')
      .setDescription('Achievements más recientes desbloqueados')
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Número de achievements recientes (máximo 15)')
          .setMinValue(5)
          .setMaxValue(15)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('user')
      .setDescription('Ver achievements de un usuario específico')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario del cual ver los achievements')
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const moneda = config.casino?.moneda || '💰';

  try {
    await interaction.deferReply();

    // Inicializar achievements manager
    if (!achievementsManager.db) {
      const { pool } = await import('../db.js');
      await achievementsManager.initialize(pool);
    }

    switch (subcommand) {
      case 'top':
        await handleTopLeaderboard(interaction, moneda);
        break;
      case 'recent':
        await handleRecentAchievements(interaction, moneda);
        break;
      case 'user':
        await handleUserAchievements(interaction, moneda);
        break;
    }

  } catch (error) {
    console.error('Error in achievements leaderboard command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('❌ Error')
      .setDescription('Hubo un error al cargar el leaderboard de achievements.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      
  // Log gambling command
  await logGamblingCommand(interaction.user, 'leaderboard-achievements', {
    action: 'executed'
  });

  await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleTopLeaderboard(interaction, moneda) {
  const limit = interaction.options.getInteger('limit') || 10;
  
  const leaderboard = await achievementsManager.getAchievementLeaderboard(limit);
  
  if (leaderboard.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🏆 Leaderboard de Achievements')
      .setDescription('¡Aún no hay usuarios con achievements desbloqueados!\n\n🚀 Sé el primero en hacer trading crypto para aparecer aquí.')
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Top Achievers - Crypto Trading')
    .setDescription('**Ranking de usuarios con más achievements desbloqueados**\n')
    .setTimestamp();

  let leaderboardText = '';
  
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    const position = i + 1;
    
    let medal = '';
    if (position === 1) medal = '🥇';
    else if (position === 2) medal = '🥈';
    else if (position === 3) medal = '🥉';
    else medal = `${position}.`;
    
    // Intentar obtener el usuario desde Discord
    let username = `Usuario ${entry.user_id}`;
    try {
      const user = await interaction.client.users.fetch(entry.user_id);
      username = user.username;
    } catch (error) {
      // User not found, use ID
    }
    
    const totalRewards = Math.floor(entry.total_rewards || 0);
    const latestDate = entry.latest_achievement ? 
      `<t:${Math.floor(new Date(entry.latest_achievement).getTime() / 1000)}:R>` : 'N/A';
    
    leaderboardText += `${medal} **${username}**\n`;
    leaderboardText += `🏆 ${entry.total_achievements} achievements • 💰 ${totalRewards.toLocaleString()} ${moneda}\n`;
    leaderboardText += `📅 Último: ${latestDate}\n\n`;
  }

  embed.addFields({
    name: '🎯 Top Achievers',
    value: leaderboardText,
    inline: false
  });

  embed.setFooter({ 
    text: 'Usa /crypto market para empezar a desbloquear achievements' 
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRecentAchievements(interaction, moneda) {
  const limit = interaction.options.getInteger('limit') || 10;
  
  const recentAchievements = await achievementsManager.getRecentAchievements(limit);
  
  if (recentAchievements.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('📰 Achievements Recientes')
      .setDescription('¡No hay achievements recientes!\n\n🚀 Comienza a hacer trading para ser el primero.')
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📰 Achievements Recientes - Crypto Trading')
    .setDescription('**Los logros más recientemente desbloqueados**\n')
    .setTimestamp();

  let recentText = '';
  
  for (const achievement of recentAchievements) {
    // Intentar obtener el usuario desde Discord
    let username = `Usuario ${achievement.user_id}`;
    try {
      const user = await interaction.client.users.fetch(achievement.user_id);
      username = user.username;
    } catch (error) {
      // User not found, use ID
    }
    
    const timestamp = Math.floor(new Date(achievement.unlocked_at).getTime() / 1000);
    const reward = Math.floor(achievement.reward_amount || 0);
    
    recentText += `🏆 **${achievement.achievement_name}**\n`;
    recentText += `👤 ${username} • 💰 +${reward.toLocaleString()} ${moneda}\n`;
    recentText += `⏰ <t:${timestamp}:R>\n\n`;
  }

  embed.addFields({
    name: '⚡ Actividad Reciente',
    value: recentText,
    inline: false
  });

  embed.setFooter({ 
    text: '¡Sigue haciendo trading para aparecer en la lista!' 
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleUserAchievements(interaction, moneda) {
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  const userId = targetUser.id;
  
  const userStats = await achievementsManager.getUserAchievementStats(userId);
  const userHistory = await achievementsManager.getUserAchievementHistory(userId, 10);
  
  if (userStats.total_achievements === 0) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🏆 Achievements de ${targetUser.username}`)
      .setDescription(`**${targetUser.username}** aún no tiene achievements desbloqueados.\n\n🚀 ¡Comienza a hacer trading crypto para desbloquear logros!`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 Achievements de ${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setDescription('**Perfil completo de achievements crypto**')
    .addFields(
      {
        name: '📊 Estadísticas Generales',
        value: `🏆 **${userStats.total_achievements}** achievements desbloqueados\n` +
               `💰 **${Math.floor(userStats.total_rewards_earned || 0).toLocaleString()}** ${moneda} ganados\n` +
               `📅 Primer logro: ${userStats.first_achievement ? 
                 `<t:${Math.floor(new Date(userStats.first_achievement).getTime() / 1000)}:R>` : 'N/A'}`,
        inline: false
      }
    )
    .setTimestamp();

  if (userHistory.length > 0) {
    let historyText = '';
    userHistory.forEach((achievement, index) => {
      const timestamp = Math.floor(new Date(achievement.unlocked_at).getTime() / 1000);
      const reward = Math.floor(achievement.reward_amount || 0);
      
      historyText += `🏆 **${achievement.achievement_name}**\n`;
      historyText += `💰 +${reward.toLocaleString()} ${moneda} • <t:${timestamp}:R>\n`;
      
      if (index < userHistory.length - 1) historyText += '\n';
    });

    embed.addFields({
      name: '📜 Historial de Achievements',
      value: historyText,
      inline: false
    });
  }

  embed.setFooter({ 
    text: targetUser.id === interaction.user.id ? 
      'Continúa haciendo trading para más achievements' : 
      `Perfil de ${targetUser.username}` 
  });

  await interaction.editReply({ embeds: [embed] });
}