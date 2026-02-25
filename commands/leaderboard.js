import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { getTopBankBalances, getTopHandBalances, getTopUsers, getComprehensiveLeaderboard } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View comprehensive casino rankings with multiple filter options')
  .addStringOption(option =>
    option.setName('filter')
      .setDescription('Choose ranking criteria')
      .setRequired(false)
      .addChoices(
        { name: '🏦 Bank Balance (Safe Money)', value: 'bank' },
        { name: '💵 Hand Balance (Available Money)', value: 'hand' },
        { name: '💎 Total Wealth (Bank + Hand)', value: 'total' },
        { name: '📊 Comprehensive View', value: 'comprehensive' }
      )
  )
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of players to show (5-20)')
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(20)
  );

export async function execute(interaction, config) {
  const moneda = config?.casino?.moneda || '💰';
  const filterType = interaction.options.getString('filter') || 'comprehensive';
  const limit = interaction.options.getInteger('limit') || 10;
  
  // Obtener datos según el filtro seleccionado
  let data = [];
  let filterTitle = '';
  let filterDescription = '';
  let filterEmoji = '';
  
  try {
    switch (filterType) {
      case 'bank':
        data = await getTopBankBalances(limit);
        filterTitle = '🏦 Bank Balance Rankings';
        filterDescription = '**The safest players - ranked by secure bank savings**\n\n💰 *Only protected bank funds count*';
        filterEmoji = '🏦';
        break;
      case 'hand':
        data = await getTopHandBalances(limit);
        filterTitle = '💵 Hand Balance Rankings';
        filterDescription = '**The active players - ranked by available hand money**\n\n🎮 *Ready-to-gamble funds only*';
        filterEmoji = '💵';
        break;
      case 'total':
        data = await getTopUsers(limit);
        filterTitle = '💎 Total Wealth Rankings';
        filterDescription = '**The wealthiest players - ranked by combined fortune**\n\n🏰 *Complete financial empire display*';
        filterEmoji = '💎';
        break;
      case 'comprehensive':
      default:
        data = await getComprehensiveLeaderboard(limit);
        filterTitle = '📊 Comprehensive Casino Leaderboard';
        filterDescription = '**Complete financial overview of casino elite**\n\n🎰 *All balance types displayed*';
        filterEmoji = '📊';
        break;
    }
  } catch (error) {
    console.error('Leaderboard data fetch error:', error);
    return interaction.reply({ content: 'Error fetching leaderboard data. Please try again.', flags: MessageFlags.Ephemeral });
  }
  
  // Verificar si hay datos
  if (!data || data.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setTitle('🏆 Casino Leaderboard')
      .setDescription('**No players found in the casino yet!**\n\n🎰 *Be the first to join the ranks*')
      .setColor(0x95a5a6)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png')
      .addFields({
        name: '🎮 Get Started Guide',
        value: `\`\`\`yaml
🚀 How to Enter Rankings:
├ Play casino games to earn money
├ Use /deposit to secure funds
├ Build up your casino empire
└ Compete for the top spots!\`\`\``,
        inline: false
      })
      .addFields({
        name: '🎯 Available Rankings',
        value: `\`\`\`🏦 /leaderboard filter:bank - Safe money
💵 /leaderboard filter:hand - Active money  
💎 /leaderboard filter:total - Total wealth
📊 /leaderboard filter:comprehensive - All\`\`\``,
        inline: false
      })
      .setFooter({ 
        text: 'Casino Leaderboard • Start your journey to greatness!',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    return interaction.reply({ embeds: [emptyEmbed] });
  }

  const embed = new EmbedBuilder()
    .setTitle(filterTitle)
    .setDescription(filterDescription)
    .setColor(getFilterColor(filterType))
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .setImage('https://i.imgur.com/hMwxvcd.png');

  // Crear la vista principal del leaderboard según el tipo
  await createLeaderboardDisplay(embed, data, filterType, moneda, interaction);
  
  // Añadir estadísticas avanzadas
  await addAdvancedStatistics(embed, data, filterType, moneda, interaction);
  
  // Información de posición personal
  await addPersonalPosition(embed, data, filterType, moneda, interaction);
  
  // Footer con información del filtro
  embed.setFooter({ 
    text: `${filterEmoji} ${getFilterName(filterType)} • Showing top ${data.length} players • Live data`,
    iconURL: interaction.user.displayAvatarURL()
  })
  .setTimestamp();

  // Crear componentes interactivos para cambiar filtros
  const components = createFilterComponents(filterType, limit);

  // Log gambling command
  await logGamblingCommand(interaction.user, 'leaderboard', {
    filter_type: filterType,
    limit: limit,
    total_users_shown: data.length
  });

  const response = await interaction.reply({ embeds: [embed], components });
  
  // Crear collector para manejar cambios de filtro
  const collector = response.createMessageComponentCollector({
    time: 300000 // 5 minutos
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'This leaderboard menu is not for you!', flags: MessageFlags.Ephemeral });
    }

    if (i.isStringSelectMenu() && i.customId === 'leaderboard-filter') {
      const newFilter = i.values[0];
      const newLimit = limit; // Mantener el mismo límite
      
      // Recrear el embed con el nuevo filtro
      await executeWithFilter(i, config, newFilter, newLimit, true);
    }
  });

  collector.on('end', async () => {
    try {
      const disabledComponents = components.map(row => {
        if (row.components[0].data.custom_id === 'leaderboard-filter') {
          const disabledMenu = StringSelectMenuBuilder.from(row.components[0]).setDisabled(true);
          return ActionRowBuilder.from(row).setComponents(disabledMenu);
        }
        return row;
      });
      await response.edit({ components: disabledComponents });
    } catch (error) {
      // Ignorar errores si el mensaje ya fue eliminado
    }
  });
}

async function executeWithFilter(interaction, config, filterType, limit, isUpdate = false) {
  const moneda = config?.casino?.moneda || '💰';
  
  // Obtener datos según el filtro
  let data = [];
  let filterTitle = '';
  let filterDescription = '';
  let filterEmoji = '';
  
  try {
    switch (filterType) {
      case 'bank':
        data = await getTopBankBalances(limit);
        filterTitle = '🏦 Bank Balance Rankings';
        filterDescription = '**The safest players - ranked by secure bank savings**\n\n💰 *Only protected bank funds count*';
        filterEmoji = '🏦';
        break;
      case 'hand':
        data = await getTopHandBalances(limit);
        filterTitle = '💵 Hand Balance Rankings';
        filterDescription = '**The active players - ranked by available hand money**\n\n🎮 *Ready-to-gamble funds only*';
        filterEmoji = '💵';
        break;
      case 'total':
        data = await getTopUsers(limit);
        filterTitle = '💎 Total Wealth Rankings';
        filterDescription = '**The wealthiest players - ranked by combined fortune**\n\n🏰 *Complete financial empire display*';
        filterEmoji = '💎';
        break;
      case 'comprehensive':
      default:
        data = await getComprehensiveLeaderboard(limit);
        filterTitle = '📊 Comprehensive Casino Leaderboard';
        filterDescription = '**Complete financial overview of casino elite**\n\n🎰 *All balance types displayed*';
        filterEmoji = '📊';
        break;
    }
  } catch (error) {
    console.error('Leaderboard filter error:', error);
    const errorMessage = isUpdate ? 'Error updating leaderboard. Please try again.' : 'Error fetching leaderboard data. Please try again.';
    return interaction[isUpdate ? 'update' : 'reply']({ content: errorMessage, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(filterTitle)
    .setDescription(filterDescription)
    .setColor(getFilterColor(filterType))
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .setImage('https://i.imgur.com/hMwxvcd.png');

  await createLeaderboardDisplay(embed, data, filterType, moneda, interaction);
  await addAdvancedStatistics(embed, data, filterType, moneda, interaction);
  await addPersonalPosition(embed, data, filterType, moneda, interaction);
  
  embed.setFooter({ 
    text: `${filterEmoji} ${getFilterName(filterType)} • Showing top ${data.length} players • Live data`,
    iconURL: interaction.user.displayAvatarURL()
  })
  .setTimestamp();

  const components = createFilterComponents(filterType, limit);
  
  if (isUpdate) {
    await interaction.update({ embeds: [embed], components });
  } else {
    await interaction.reply({ embeds: [embed], components });
  }
}

function getFilterColor(filterType) {
  const colors = {
    'bank': 0x2ECC71,      // Verde para seguridad
    'hand': 0xE74C3C,      // Rojo para activo
    'total': 0xFFD700,     // Dorado para riqueza
    'comprehensive': 0x9B59B6  // Púrpura para completo
  };
  return colors[filterType] || colors['comprehensive'];
}

function getFilterName(filterType) {
  const names = {
    'bank': 'Bank Rankings',
    'hand': 'Hand Rankings', 
    'total': 'Total Wealth',
    'comprehensive': 'Comprehensive View'
  };
  return names[filterType] || names['comprehensive'];
}

function createFilterComponents(currentFilter, limit) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('leaderboard-filter')
    .setPlaceholder('🔄 Change ranking filter...')
    .addOptions([
      {
        label: 'Bank Balance Rankings',
        description: 'Safe money rankings - secure bank funds only',
        value: 'bank',
        emoji: '🏦',
        default: currentFilter === 'bank'
      },
      {
        label: 'Hand Balance Rankings',
        description: 'Active money rankings - available gambling funds',
        value: 'hand',
        emoji: '💵',
        default: currentFilter === 'hand'
      },
      {
        label: 'Total Wealth Rankings',
        description: 'Complete wealth - combined bank and hand money',
        value: 'total',
        emoji: '💎',
        default: currentFilter === 'total'
      },
      {
        label: 'Comprehensive Overview',
        description: 'Complete view - all financial data displayed',
        value: 'comprehensive',
        emoji: '📊',
        default: currentFilter === 'comprehensive'
      }
    ]);

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

async function createLeaderboardDisplay(embed, data, filterType, moneda, interaction) {
  const podiumEmojis = ['🥇', '🥈', '🥉'];
  
  if (filterType === 'comprehensive') {
    // Vista comprehensiva con todos los datos
    let comprehensiveText = `\`\`\`💎 Complete Financial Leaderboard:\n`;
    comprehensiveText += '┌─────┬───────────────────┬─────────────┬─────────────┬─────────────┐\n';
    comprehensiveText += '│ Pos │ Player            │    Bank     │    Hand     │    Total    │\n';
    comprehensiveText += '├─────┼───────────────────┼─────────────┼─────────────┼─────────────┤\n';
    
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      let username = `User ${data[i].userId}`;
      try {
        const user = await interaction.client.users.fetch(data[i].userId);
        username = user.username.length > 16 ? user.username.substring(0, 16) + '...' : user.username;
      } catch {}
      
      const position = (i + 1).toString().padStart(3);
      const playerName = username.padEnd(17);
      const bankAmount = data[i].bank.toLocaleString().padStart(11);
      const handAmount = data[i].hand.toLocaleString().padStart(11);
      const totalAmount = data[i].total.toLocaleString().padStart(11);
      
      comprehensiveText += `│ ${position} │ ${playerName} │ ${bankAmount} │ ${handAmount} │ ${totalAmount} │\n`;
    }
    
    comprehensiveText += '└─────┴───────────────────┴─────────────┴─────────────┴─────────────┘```';
    
    embed.addFields({
      name: '📊 Comprehensive Financial Overview',
      value: comprehensiveText,
      inline: false
    });
  } else {
    // Vista de podium para top 3
    if (data.length > 0) {
      let podiumText = '';
      for (let i = 0; i < Math.min(3, data.length); i++) {
        let username = `User ${data[i].userId}`;
        try {
          const user = await interaction.client.users.fetch(data[i].userId);
          username = user.username;
        } catch {}
        
        const medal = podiumEmojis[i];
        let amountText = '';
        
        switch (filterType) {
          case 'bank':
            amountText = `${data[i].bank.toLocaleString()} ${moneda}`;
            break;
          case 'hand':
            amountText = `${data[i].hand.toLocaleString()} ${moneda}`;
            break;
          case 'total':
            amountText = `${data[i].total.toLocaleString()} ${moneda}`;
            break;
        }
        
        podiumText += `${medal} **${username}**\n`;
        podiumText += `    └ ${amountText}\n\n`;
      }

      embed.addFields({
        name: '🎖️ Elite Podium Champions',
        value: `\`\`\`yaml
🏆 Top 3 Casino Leaders - ${getFilterName(filterType)}
══════════════════════════════════════════\`\`\`\n${podiumText}`,
        inline: false
      });
    }
    
    // Tabla completa si hay más de 3 jugadores
    if (data.length > 3) {
      let rankingsText = `\`\`\`📈 Complete Rankings (Top ${data.length}):\n`;
      rankingsText += '┌─────┬─────────────────────┬─────────────────────┐\n';
      
      const headerValue = filterType === 'bank' ? 'Bank Balance' : 
                         filterType === 'hand' ? 'Hand Balance' : 'Total Wealth';
      
      rankingsText += `│ Pos │ Player              │ ${headerValue.padStart(19)} │\n`;
      rankingsText += '├─────┼─────────────────────┼─────────────────────┤\n';
      
      for (let i = 0; i < data.length; i++) {
        let username = `User ${data[i].userId}`;
        try {
          const user = await interaction.client.users.fetch(data[i].userId);
          username = user.username.length > 18 ? user.username.substring(0, 18) + '...' : user.username;
        } catch {}
        
        const position = (i + 1).toString().padStart(3);
        const playerName = username.padEnd(19);
        
        let amount = '';
        switch (filterType) {
          case 'bank':
            amount = data[i].bank;
            break;
          case 'hand':
            amount = data[i].hand;
            break;
          case 'total':
            amount = data[i].total;
            break;
        }
        
        const amountText = `${amount.toLocaleString()} ${moneda}`.padStart(19);
        rankingsText += `│ ${position} │ ${playerName} │ ${amountText} │\n`;
      }
      
      rankingsText += '└─────┴─────────────────────┴─────────────────────┘```';
      
      embed.addFields({
        name: `📈 Complete ${getFilterName(filterType)}`,
        value: rankingsText,
        inline: false
      });
    }
  }
}

async function addAdvancedStatistics(embed, data, filterType, moneda, interaction) {
  if (data.length === 0) return;
  
  let statistics = '';
  const topPlayer = data[0];
  
  let topUsername = `User ${topPlayer.userId}`;
  try {
    const user = await interaction.client.users.fetch(topPlayer.userId);
    topUsername = user.username;
  } catch {}
  
  if (filterType === 'comprehensive') {
    const totalBank = data.reduce((sum, p) => sum + p.bank, 0);
    const totalHand = data.reduce((sum, p) => sum + p.hand, 0);
    const totalWealth = data.reduce((sum, p) => sum + p.total, 0);
    const avgTotal = Math.round(totalWealth / data.length);
    
    statistics = `\`\`\`yaml
💰 Total Banked Money: ${totalBank.toLocaleString()} ${moneda}
💵 Total Hand Money:   ${totalHand.toLocaleString()} ${moneda}
💎 Combined Wealth:    ${totalWealth.toLocaleString()} ${moneda}
📊 Average Wealth:     ${avgTotal.toLocaleString()} ${moneda}
👑 Wealthiest Player:  ${topUsername}
🏆 Their Total:        ${topPlayer.total.toLocaleString()} ${moneda}
📋 Ranked Players:     ${data.length}\`\`\``;
  } else {
    let total = 0;
    let leaderAmount = 0;
    let fieldName = '';
    
    switch (filterType) {
      case 'bank':
        total = data.reduce((sum, p) => sum + p.bank, 0);
        leaderAmount = topPlayer.bank;
        fieldName = 'Banked Money';
        break;
      case 'hand':
        total = data.reduce((sum, p) => sum + p.hand, 0);
        leaderAmount = topPlayer.hand;
        fieldName = 'Hand Money';
        break;
      case 'total':
        total = data.reduce((sum, p) => sum + p.total, 0);
        leaderAmount = topPlayer.total;
        fieldName = 'Total Wealth';
        break;
    }
    
    const average = Math.round(total / data.length);
    
    statistics = `\`\`\`yaml
💰 Total ${fieldName}:  ${total.toLocaleString()} ${moneda}
📊 Average Amount:      ${average.toLocaleString()} ${moneda}
👑 Current Leader:      ${topUsername}
🏆 Leader Amount:       ${leaderAmount.toLocaleString()} ${moneda}
📋 Active Players:      ${data.length}\`\`\``;
  }
  
  embed.addFields({
    name: '📊 Advanced Statistics',
    value: statistics,
    inline: true
  });
  
  // Información del ranking
  let rankingInfo = '';
  switch (filterType) {
    case 'bank':
      rankingInfo = `\`\`\`🏦 Bank Rankings Info:
┌─────────────────────────────────┐
│ 🛡️ Only secure bank funds      │
│ 💰 Protected from robberies    │
│ 📈 Encourages safe play        │
│ 🏆 Rewards security-minded     │
└─────────────────────────────────┘\`\`\``;
      break;
    case 'hand':
      rankingInfo = `\`\`\`💵 Hand Rankings Info:
┌─────────────────────────────────┐
│ 🎮 Available gambling funds    │
│ ⚡ Ready for immediate play    │
│ 🎯 Shows active players        │
│ 💫 Rewards bold risk-takers    │
└─────────────────────────────────┘\`\`\``;
      break;
    case 'total':
      rankingInfo = `\`\`\`💎 Total Wealth Info:
┌─────────────────────────────────┐
│ 🏰 Complete financial empire   │
│ 📊 Bank + Hand combined        │
│ 👑 True wealth measurement     │
│ 🌟 Ultimate casino status      │
└─────────────────────────────────┘\`\`\``;
      break;
    case 'comprehensive':
      rankingInfo = `\`\`\`📊 Comprehensive View:
┌─────────────────────────────────┐
│ 💰 All financial data shown    │
│ 📈 Complete wealth breakdown    │
│ 🔍 Detailed analysis view      │
│ 🎯 Professional ranking tool   │
└─────────────────────────────────┘\`\`\``;
      break;
  }
  
  embed.addFields({
    name: '💡 Ranking Information',
    value: rankingInfo,
    inline: true
  });
}

async function addPersonalPosition(embed, data, filterType, moneda, interaction) {
  // Buscar posición del usuario actual
  const userId = interaction.user.id;
  let userPosition = -1;
  let userData = null;
  
  switch (filterType) {
    case 'bank':
      userPosition = data.findIndex(player => player.userId === userId);
      userData = data[userPosition];
      break;
    case 'hand':
      userPosition = data.findIndex(player => player.userId === userId);
      userData = data[userPosition];
      break;
    case 'total':
    case 'comprehensive':
      userPosition = data.findIndex(player => player.userId === userId);
      userData = data[userPosition];
      break;
  }
  
  if (userPosition !== -1 && userData) {
    let personalInfo = `\`\`\`🏅 Your Current Ranking:\n`;
    personalInfo += `Rank: #${userPosition + 1} of ${data.length} players\n\n`;
    
    if (filterType === 'comprehensive') {
      personalInfo += `💰 Your Bank:  ${userData.bank.toLocaleString()} ${moneda}\n`;
      personalInfo += `💵 Your Hand:  ${userData.hand.toLocaleString()} ${moneda}\n`;
      personalInfo += `💎 Your Total: ${userData.total.toLocaleString()} ${moneda}\n\n`;
    } else {
      let amount = '';
      let label = '';
      switch (filterType) {
        case 'bank':
          amount = userData.bank;
          label = 'Bank';
          break;
        case 'hand':
          amount = userData.hand;
          label = 'Hand';
          break;
        case 'total':
          amount = userData.total;
          label = 'Total';
          break;
      }
      personalInfo += `💰 Your ${label}: ${amount.toLocaleString()} ${moneda}\n\n`;
    }
    
    const statusText = userPosition === 0 ? '👑 CHAMPION!' : 
                      userPosition < 3 ? '🎖️ Elite Status!' : 
                      userPosition < 10 ? '🏅 Top 10 Player!' : '⭐ Climbing the ranks!';
    
    personalInfo += `Status: ${statusText}\`\`\``;
    
    embed.addFields({
      name: '🎯 Your Performance',
      value: personalInfo,
      inline: false
    });
  } else {
    embed.addFields({
      name: '🚀 Join the Competition',
      value: `\`\`\`💡 You're not in the current rankings!
┌─────────────────────────────────┐
│ 🎮 Play casino games to earn    │
│ 💰 Build up your ${filterType} balance │
│ 🏆 Compete for top positions    │
│ 📈 Start your casino journey!   │
└─────────────────────────────────┘\`\`\``,
      inline: false
    });
  }
}
