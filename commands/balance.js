import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, addUserIfNotExists, getUserBankCapacity, getReferralInfo } from '../db.js';
import { checkJailStatus } from '../util/jailSystem.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your hand and bank balance or view another user\'s balance.')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to check balance (optional - leave empty for your own balance)')
      .setRequired(false)
  );

export async function execute(interaction, config) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;
  const isOwnBalance = targetUser.id === interaction.user.id;

  // Verificar si el usuario que ejecuta el comando está en la cárcel (solo para su propio balance)
  if (isOwnBalance && !(await checkJailStatus(interaction.user.id, interaction, config))) {
    return;
  }
  
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);
  const moneda = config?.casino?.moneda || '💰';
  const total = balances.hand + balances.bank;
  
  // Determinar qué información mostrar basado en si es el propio balance o de otro usuario
  let title, description, showBank = true;
  
  if (isOwnBalance) {
    title = '🏛️ Personal Casino Treasury';
    description = `**Welcome to your financial dashboard, ${targetUser.username}!**\n\n💰 *Complete overview of your casino empire*`;
  } else {
    title = `�️ ${targetUser.username}'s Public Profile`;
    description = `**Viewing ${targetUser.username}'s public financial information**\n\n🔍 *Transparency in casino gaming*`;
    // Para otros usuarios, solo mostrar hand si está configurado para mostrar info completa
    const showFullBalance = config?.balance?.showOthersFullBalance ?? false;
    showBank = showFullBalance;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(isOwnBalance ? 0x1abc9c : 0x3498db)
    .setThumbnail(targetUser.displayAvatarURL())
    .setImage(isOwnBalance ? 'https://i.imgur.com/hMwxvcd.png' : null);
  
  if (showBank) {
    // Obtener capacidad del banco si es el balance propio
    let bankCapacity = null;
    if (isOwnBalance) {
      bankCapacity = await getUserBankCapacity(userId);
    }
    
    // Balance principal con diseño profesional
    embed.addFields({
      name: '� Financial Overview',
      value: `\`\`\`yaml
💵 Hand Money:    ${balances.hand.toLocaleString().padStart(15)} ${moneda}
🏦 Bank Savings:  ${balances.bank.toLocaleString().padStart(15)} ${moneda}
💎 Total Wealth:  ${total.toLocaleString().padStart(15)} ${moneda}\`\`\``,
      inline: false
    });

    if (isOwnBalance && bankCapacity) {
      const usedPercentage = Math.round((balances.bank / bankCapacity) * 100);
      const remainingSpace = bankCapacity - balances.bank;
      
      // Crear barra de progreso visual
      const barLength = 20;
      const filledBars = Math.min(Math.max(Math.round((balances.bank / bankCapacity) * barLength), 0), barLength);
      const emptyBars = Math.max(barLength - filledBars, 0);
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      embed.addFields({
        name: '🏦 Bank Storage Analysis',
        value: `\`\`\`🏛️ Capacity Management:
┌─────────────────────────────────┐
│ Used:      ${balances.bank.toLocaleString().padStart(12)} ${moneda} │
│ Capacity:  ${bankCapacity.toLocaleString().padStart(12)} ${moneda} │
│ Available: ${remainingSpace.toLocaleString().padStart(12)} ${moneda} │
└─────────────────────────────────┘

📊 Storage Usage: ${usedPercentage}%
[${progressBar}] ${usedPercentage}%\`\`\``,
        inline: false
      });

      // Recomendaciones basadas en uso del banco
      let recommendation = '';
      if (usedPercentage >= 90) {
        recommendation = `\`\`\`⚠️  URGENT: Bank Almost Full!
┌─────────────────────────────────┐
│ 🚨 Immediate Action Required    │
│ 🛒 Visit /shop → Banking        │
│ 💡 Upgrade bank capacity now    │
│ 🎯 Avoid losing deposits        │
└─────────────────────────────────┘\`\`\``;
      } else if (usedPercentage >= 70) {
        recommendation = `\`\`\`💡 Smart Banking Tips:
┌─────────────────────────────────┐
│ 📈 Bank getting full (${usedPercentage}%)      │
│ 🛒 Consider bank upgrades       │
│ 💰 Plan for future earnings     │
│ 🎮 Keep gambling funds in hand  │
└─────────────────────────────────┘\`\`\``;
      } else {
        recommendation = `\`\`\`✅ Excellent Financial Status:
┌─────────────────────────────────┐
│ 🏦 Bank space available (${usedPercentage}%)   │
│ 💰 Safe storage for winnings    │
│ 🎮 Ready for casino games       │
│ 📊 Optimal money management     │
└─────────────────────────────────┘\`\`\``;
      }

      embed.addFields({
        name: '💡 Financial Advisory',
        value: recommendation,
        inline: false
      });
    }

    // Quick actions solo para balance propio
    if (isOwnBalance) {
      embed.addFields({
        name: '🎯 Quick Actions',
        value: `\`\`\`🏦 Banking Operations:
• /deposit amount - Secure money in bank
• /withdraw amount - Access banked funds

🎮 Gaming Commands:
• /shop - Browse premium items & upgrades
• /inventory - View owned items & effects

📊 Statistics:
• /leaderboard - Compare with other players\`\`\``,
        inline: false
      });
    }
  } else {
    // Mostrar información limitada para otros usuarios con diseño profesional
    embed.addFields({
      name: '�️ Public Financial Information',
      value: `\`\`\`yaml
💵 Visible Funds:  ${balances.hand.toLocaleString().padStart(15)} ${moneda}
🔒 Private Bank:   Hidden for Privacy
🛡️ Security:      Full Protection Active\`\`\``,
      inline: false
    });

    embed.addFields({
      name: '� Privacy Protection',
      value: `\`\`\`ℹ️  Information Policy:
┌─────────────────────────────────┐
│ ✅ Hand balance is public       │
│ 🔒 Bank balance is private      │
│ 🛡️ Full protection enabled     │
│ 👥 Promotes fair gaming        │
└─────────────────────────────────┘\`\`\``,
      inline: false
    });
  }
  
  // Añadir estadísticas de referidos (solo para balance propio)
  if (isOwnBalance) {
    try {
      const referralInfo = await getReferralInfo(userId);
      
      if (referralInfo.referralsCount > 0 || referralInfo.totalEarned > 0) {
        const referralTitle = getReferralTitle(referralInfo.referralsCount);
        
        embed.addFields({
          name: `🎯 Referral Network ${referralTitle}`,
          value: `\`\`\`yaml
👥 Total Referrals: ${referralInfo.referralsCount.toLocaleString()}
💰 Total Earned:    ${referralInfo.totalEarned.toLocaleString()} ${moneda}
🎁 From Bonuses:    ${referralInfo.bonusEarned.toLocaleString()} ${moneda}
🔑 Your Code:       ${referralInfo.referralCode}
\`\`\``,
          inline: false
        });
      } else {
        embed.addFields({
          name: '🎯 Referral System',
          value: `\`\`\`💡 Start earning with referrals!
┌─────────────────────────────────┐
│ 🎁 Your code: ${referralInfo.referralCode}      │
│ 💰 Earn 10,000 per referral     │
│ 🎊 Bonus milestones available   │
│ 📋 Use /ref info for details    │
└─────────────────────────────────┘\`\`\``,
          inline: false
        });
      }
    } catch (error) {
      // Si hay error obteniendo referral info, continuar sin mostrar
      console.log('Could not load referral info for balance:', error.message);
    }
  }
  
  embed
    .setFooter({ 
      text: isOwnBalance 
        ? `Casino Treasury • Last updated • Smart banking keeps your ${moneda} safe!` 
        : `Public Profile View • Requested by ${interaction.user.username} • Casino Bot`,
      iconURL: targetUser.displayAvatarURL()
    })
    .setTimestamp();

  // Log gambling command
  await logGamblingCommand(interaction.user, 'balance', {
    target_user: targetUser.username,
    is_own_balance: isOwnBalance,
    hand_balance: balances.hand,
    bank_balance: balances.bank
  });
  
  return interaction.reply({ embeds: [embed] });
}

// Función helper para títulos de referidos
function getReferralTitle(count) {
  if (count >= 1000) return '🌟';
  if (count >= 500) return '🔥';
  if (count >= 100) return '💎';
  if (count >= 50) return '👑';
  if (count >= 25) return '⭐';
  if (count >= 10) return '🎯';
  return '';
}