
import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('crash')
  .setDescription('Play crash and bet your virtual money.')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount to bet')
      .setRequired(true)
  );

async function playCrashRound(interaction, config, bet, moneda, minBet, maxBet, userId) {
  // Si la función puede tardar, usar deferReply como respaldo
  const startTime = Date.now();
  
  const balances = await getUserBalances(userId);

  let crashed = false;
  let multiplier = 1.00;
  let cashout = false;
  let interval;
  let message;

  const embed = new EmbedBuilder()
    .setTitle('Crash Game')
    .setColor(0xf1c40f)
    .setDescription(`Bet: **${bet} ${moneda}**\nMultiplier: **x${multiplier.toFixed(2)}**`)
    .addFields(
      { name: 'Your Hand', value: `${balances.hand} ${moneda}`, inline: true }
    )
    .setFooter({ text: 'Press Cash Out before it crashes!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cashout').setLabel('💸 Cash Out').setStyle(ButtonStyle.Success)
  );

  // Verificar si la interacción ya fue respondida
  if (interaction.replied || interaction.deferred) {
    console.error('Interaction already replied or deferred');
    return;
  }

  // Si ha pasado mucho tiempo desde el inicio, usar defer + editReply
  const timePassed = Date.now() - startTime;
  if (timePassed > 2000) { // Si han pasado más de 2 segundos
    try {
      await interaction.deferReply();
      message = await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error with deferred crash reply:', error);
      return;
    }
  } else {
    // Usar reply normal si aún hay tiempo
    try {
      await interaction.reply({ embeds: [embed], components: [row] });
      message = await interaction.fetchReply();
    } catch (error) {
      console.error('Error sending crash reply:', error);
      
      // Si es error de interacción expirada, intentar enviar mensaje al canal
      if (error.code === 10062) {
        try {
          message = await interaction.channel.send({ embeds: [embed], components: [row] });
          console.log('Sent message to channel as fallback');
        } catch (channelError) {
          console.error('Failed to send fallback message to channel:', channelError);
          return;
        }
      } else {
        return;
      }
    }
  }

  // Collector for cashout - usar canal como respaldo si el mensaje falla
  const filter = i => i.user.id === userId && i.customId === 'cashout';
  let collector;
  
  if (message && message.createMessageComponentCollector) {
    collector = message.createMessageComponentCollector({ filter, time: 20000 });
  } else {
    // Usar collector del canal como respaldo
    collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });
  }

  collector.on('collect', async i => {
    cashout = true;
    await i.deferUpdate(); // Evita interacción fallida
    collector.stop();
  });

  // Lógica de crash más realista: la probabilidad de crash crece exponencialmente con el multiplicador
  // Al principio es muy baja, pero sube rápido después de x2
  interval = setInterval(async () => {
    if (crashed || cashout) return;
    // Aumenta el multiplicador de forma suave
    multiplier += Math.max(0.01, Math.random() * 0.18 + 0.07);
    // Crash chance: p = 1 - (0.99)^(multiplier*2) (crece rápido después de x2)
    const crashChance = 1 - Math.pow(0.99, multiplier * 2);
    if (Math.random() < crashChance) {
      crashed = true;
      collector.stop();
    }
    // Actualiza el embed
    const updateEmbed = EmbedBuilder.from(embed)
      .setDescription(`Bet: **${bet} ${moneda}**\nMultiplier: **x${multiplier.toFixed(2)}**`)
      .setColor(0xf1c40f);
    
    // Usar el mensaje para editar, no la interacción directamente
    try {
      if (message && message.edit) {
        await message.edit({ embeds: [updateEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [updateEmbed] });
      }
    } catch (error) {
      console.error('Error updating crash message:', error);
    }
  }, 900);

  collector.on('end', async () => {
    clearInterval(interval);
    let resultEmbed;
    let newHand = balances.hand;
    let payout = 0;
    if (cashout) {
      payout = Math.floor(bet * multiplier);
      let winnings = payout - bet;
      
      // Aplicar multiplicadores de efectos si ganó
      const effectMultiplier = await getCurrentMultiplier(userId);
      if (effectMultiplier > 1 && winnings > 0) {
        winnings = Math.floor(winnings * effectMultiplier);
        payout = winnings + bet;
      }
      
      newHand += winnings;
      resultEmbed = new EmbedBuilder()
        .setTitle('Crash - You Cashed Out!')
        .setColor(0x00e676)
        .setDescription(`You cashed out at **x${multiplier.toFixed(2)}** and won **${payout - bet} ${moneda}**!`)
        .addFields(
          { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
        )
        .setFooter({ text: 'Nice timing!' });
    } else if (crashed) {
      newHand -= bet;
      resultEmbed = new EmbedBuilder()
        .setTitle('Crash!')
        .setColor(0xe74c3c)
        .setDescription(`The game crashed at **x${multiplier.toFixed(2)}**. You lost **${bet} ${moneda}**.`)
        .addFields(
          { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
        )
        .setFooter({ text: 'Better luck next time!' });
    } else {
      // Timeout, treat as crash
      newHand -= bet;
      resultEmbed = new EmbedBuilder()
        .setTitle('Crash!')
        .setColor(0xe74c3c)
        .setDescription(`You waited too long! The game crashed at **x${multiplier.toFixed(2)}**. You lost **${bet} ${moneda}**.`)
        .addFields(
          { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
        )
        .setFooter({ text: 'Be faster next time!' });
    }
    await setUserBalances(userId, newHand, balances.bank);
    
    // Log the crash game result
    const resultType = newHand > balances.hand ? 'WON' : 'LOST';
    const profit = newHand - balances.hand;
    await logGamblingCommand(interaction.user, 'crash', {
      amount: `${bet} ${moneda}`,
      result: `${resultType} - Crash at x${multiplier.toFixed(2)} | Net: ${profit > 0 ? '+' : ''}${profit}`,
      additional: `Cash out: ${cashout ? `x${multiplier.toFixed(2)}` : 'Did not cash out'}`
    });
    
    // Play again/end buttons
    const againRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('playagain').setLabel('Play Again').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger)
    );
    try {
      if (message && message.edit) {
        await message.edit({ embeds: [resultEmbed], components: [againRow] });
      } else {
        await interaction.editReply({ embeds: [resultEmbed], components: [againRow] });
      }
    } catch (error) {
      console.error('Error updating final crash message:', error);
      return;
    }

    // Collector for play again/end
    const againFilter = btn => btn.user.id === userId && ['playagain', 'end'].includes(btn.customId);
    let againCollector;
    
    if (message && message.createMessageComponentCollector) {
      againCollector = message.createMessageComponentCollector({ filter: againFilter, time: 30000, max: 1 });
    } else {
      againCollector = interaction.channel.createMessageComponentCollector({ filter: againFilter, time: 30000, max: 1 });
    }
    againCollector.on('collect', async btn => {
      if (btn.customId === 'playagain') {
        const updatedBalances = await getUserBalances(userId);
        await playCrashRound(btn, config, bet, moneda, minBet, maxBet, userId);
      } else if (btn.customId === 'end') {
        // Disable buttons
        const disabled = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('playagain').setLabel('Play Again').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await btn.update({ components: [disabled] });
      }
    });
  });
}

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet');
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.crash?.minBet ?? 10;
  const maxBet = config.crash?.maxBet ?? 100000;
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);
  // Verificar todas las condiciones antes de responder
  if (bet < minBet) {
    return interaction.reply({ content: `Minimum bet is ${minBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (bet > maxBet) {
    return interaction.reply({ content: `Maximum bet is ${maxBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (balances.hand < bet) {
    return interaction.reply({ content: `You do not have enough money in hand.`, flags: MessageFlags.Ephemeral });
  }
  
  // Solo llamar playCrashRound si la interacción aún no ha sido respondida
  if (!interaction.replied && !interaction.deferred) {
    await playCrashRound(interaction, config, bet, moneda, minBet, maxBet, userId);
  }
}
