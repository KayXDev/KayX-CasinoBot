import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getReferralInfo, useReferralCode, getReferralLeaderboard } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('ref')
  .setDescription('🎯 Referral system - Invite friends and earn rewards!')
  .addSubcommand(subcommand =>
    subcommand
      .setName('info')
      .setDescription('View your referral code and statistics'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('use')
      .setDescription('Use someone\'s referral code to get bonus money')
      .addStringOption(option =>
        option.setName('code')
          .setDescription('The referral code to use')
          .setRequired(true)
          .setMaxLength(10)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('top')
      .setDescription('View the referral leaderboard')
      .addIntegerOption(option =>
        option.setName('limit')
          .setDescription('Number of top referrers to show (default: 10)')
          .setMinValue(5)
          .setMaxValue(25)
          .setRequired(false)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  const moneda = config.casino?.moneda || '💰';

  try {
    switch (subcommand) {
      case 'info':
        await showReferralInfo(interaction, userId, moneda);
        break;
      case 'use':
        await useReferralCodeCommand(interaction, userId, moneda);
        break;
      case 'top':
        await showReferralLeaderboard(interaction, moneda);
        break;
    }
  } catch (error) {
    console.error('Error in referral command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription(`Something went wrong: ${error.message}`)
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

// Mostrar información de referidos del usuario
async function showReferralInfo(interaction, userId, moneda) {
  const referralInfo = await getReferralInfo(userId);
  
  // Calcular próximo milestone usando configuración
  const milestones = Object.keys(config.referrals.milestones).map(Number).sort((a, b) => a - b);
  const nextMilestone = milestones.find(m => m > referralInfo.referralsCount);
  const nextMilestoneBonus = nextMilestone ? config.referrals.milestones[nextMilestone] : 0;
  
  // Calcular progreso hacia próximo milestone
  let progressText = '';
  if (nextMilestone) {
    const progress = referralInfo.referralsCount;
    const total = nextMilestone;
    const percentage = Math.floor((progress / total) * 100);
    const progressBar = generateProgressBar(percentage);
    progressText = `\n🎯 **Next Milestone:** ${nextMilestone} referrals\n💰 **Reward:** ${nextMilestoneBonus.toLocaleString()} ${moneda}\n📊 **Progress:** ${progressBar} ${percentage}% (${progress}/${total})\n⏳ **${total - progress} referrals to go!**`;
  }
  
  // Obtener título basado en referrals
  const title = getReferralTitle(referralInfo.referralsCount);
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🎯 Your Referral Information ${title}`)
    .setDescription([
      `**Your Referral Code:** \`${referralInfo.referralCode}\``,
      ``,
      `💰 **Total Earned:** ${referralInfo.totalEarned.toLocaleString()} ${moneda}`,
      `├─ From referrals: ${(referralInfo.totalEarned - referralInfo.bonusEarned).toLocaleString()} ${moneda}`,
      `└─ From bonuses: ${referralInfo.bonusEarned.toLocaleString()} ${moneda}`,
      ``,
      `👥 **Referrals Made:** ${referralInfo.referralsCount}`,
      referralInfo.referredBy ? `🤝 **You were referred by:** <@${referralInfo.referredBy}>` : ``,
      progressText
    ].filter(line => line !== '').join('\n'))
    .addFields([
      {
        name: '🎁 How it works',
        value: [
          `• Share your code: \`${referralInfo.referralCode}\``,
          `• They use: \`/ref use ${referralInfo.referralCode}\``,
          `• You get: **${config.referrals.rewards.referrer.toLocaleString()}** ${moneda}`,
          `• They get: **${config.referrals.rewards.referee.toLocaleString()}** ${moneda}`,
          `• Bonus milestones unlock more rewards!`
        ].join('\n'),
        inline: false
      }
    ])
    .setFooter({ 
      text: `Casino Referral System • Code: ${referralInfo.referralCode}`,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

  // Añadir thumbnail basado en nivel
  if (referralInfo.referralsCount >= 100) {
    embed.setThumbnail('https://i.imgur.com/diamond.png'); // Imaginary diamond icon
  } else if (referralInfo.referralsCount >= 25) {
    embed.setThumbnail('https://i.imgur.com/gold.png'); // Imaginary gold icon
  }

  await interaction.reply({ embeds: [embed] });
  await logGamblingCommand(interaction.user.id, 'ref-info', { referrals: referralInfo.referralsCount });
}

// Usar código de referido
async function useReferralCodeCommand(interaction, userId, moneda) {
  const referralCode = interaction.options.getString('code').toUpperCase();
  
  try {
    const result = await useReferralCode(userId, referralCode);
    
    let embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎉 Referral Code Accepted!')
      .setDescription([
        `**Welcome to the casino family!**`,
        ``,
        `💰 **You earned:** ${result.referredEarned.toLocaleString()} ${moneda}`,
        `💰 **Your referrer earned:** ${result.referrerEarned.toLocaleString()} ${moneda}`,
        ``,
        `🤝 **You were referred by:** <@${result.referrerId}>`,
        `👥 **Their new referral count:** ${result.newReferralCount}`
      ].join('\n'))
      .setFooter({ text: 'Thank you for joining our community!' })
      .setTimestamp();

    // Si el referidor alcanzó un milestone
    if (result.bonusAwarded) {
      embed.addFields([
        {
          name: '🏆 Milestone Bonus Unlocked!',
          value: [
            `<@${result.referrerId}> reached **${result.bonusAwarded.milestone}** referrals!`,
            `💎 **Bonus awarded:** ${result.bonusAwarded.bonus.toLocaleString()} ${moneda}`,
            `🎊 Congratulations on this achievement!`
          ].join('\n'),
          inline: false
        }
      ]);
    }

    await interaction.reply({ embeds: [embed] });
    await logGamblingCommand(userId, 'ref-use', { code: referralCode, referrer: result.referrerId });
    
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Cannot Use Referral Code')
      .setDescription(error.message)
      .setFooter({ text: 'Make sure the code is correct and you haven\'t been referred before' });

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

// Mostrar leaderboard de referidos
async function showReferralLeaderboard(interaction, moneda) {
  const limit = interaction.options.getInteger('limit') || 10;
  const leaderboard = await getReferralLeaderboard(limit);
  
  if (leaderboard.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('🏆 Referral Leaderboard')
      .setDescription('No referrals have been made yet. Be the first!')
      .setFooter({ text: 'Start referring friends to appear on this leaderboard!' });

    return await interaction.reply({ embeds: [embed] });
  }

  const medals = ['👑', '🥈', '🥉'];
  const leaderboardText = leaderboard.map((user, index) => {
    const medal = medals[index] || '🔸';
    const title = getReferralTitle(user.referralsCount);
    return `${medal} **<@${user.userId}>** ${title}\n   ├─ **${user.referralsCount}** referrals\n   └─ **${user.totalEarned.toLocaleString()}** ${moneda} earned`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 Top ${limit} Referral Leaders`)
    .setDescription(leaderboardText)
    .addFields([
      {
        name: '💡 Want to climb the ranks?',
        value: `Use \`/ref info\` to get your referral code and start inviting friends!`,
        inline: false
      }
    ])
    .setFooter({ text: `Showing top ${leaderboard.length} out of ${limit} requested` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  await logGamblingCommand(interaction.user.id, 'ref-leaderboard', { limit });
}

// Utilidades
function generateProgressBar(percentage, length = 10) {
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

function getReferralTitle(count) {
  const titles = config.referrals.display.titles;
  if (count >= 1000) return titles.legend;
  if (count >= 500) return titles.king;
  if (count >= 100) return titles.diamond;
  if (count >= 50) return titles.magnate;
  if (count >= 25) return titles.influencer;
  if (count >= 10) return titles.recruiter;
  return '';
}

function getNextMilestoneBonus(milestone) {
  return config.referrals.milestones[milestone] || 0;
}