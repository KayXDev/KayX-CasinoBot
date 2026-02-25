
import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('slots')
  .setDescription('Play slots and bet your virtual money.')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount to bet')
      .setRequired(true)
  );


export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.slots?.minBet ?? 10;
  const maxBet = config.slots?.maxBet ?? 100000;
  const jackpotMultiplier = config.slots?.payouts?.jackpot ?? 10;
  const pairMultiplier = config.slots?.payouts?.pair ?? 2;
  let bet = interaction.options.getInteger('bet');
  await addUserIfNotExists(userId);
  let balances = await getUserBalances(userId);
  if (bet < minBet) {
    return interaction.reply({ content: `Minimum bet is ${minBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (bet > maxBet) {
    return interaction.reply({ content: `Maximum bet is ${maxBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (balances.hand < bet) {
    return interaction.reply({ content: `You do not have enough money in hand.`, flags: MessageFlags.Ephemeral });
  }

  // Slot symbols and odds
  const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '🍀'];
  const getRow = () => Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);

  async function playSpin(i, betAmount, jackpotMult = jackpotMultiplier, pairMult = pairMultiplier) {
    try {
      balances = await getUserBalances(userId);
      if (balances.hand < betAmount) {
        return i.update({ content: `You do not have enough money in hand.`, embeds: [], components: [], flags: MessageFlags.Ephemeral });
      }
      const row = getRow();
      let payout = 0;
      let winType = '';
      if (row[0] === row[1] && row[1] === row[2]) {
        payout = betAmount * jackpotMult;
        winType = 'JACKPOT!';
      } else if (row[0] === row[1] || row[1] === row[2] || row[0] === row[2]) {
        payout = betAmount * pairMult;
        winType = 'Double!';
      }
      let newHand = balances.hand;
      let winnings = 0;
      
      if (payout > 0) {
        winnings = payout - betAmount;
        
        // Aplicar multiplicadores si ganó
        const multiplier = await getCurrentMultiplier(userId);
        if (multiplier > 1) {
          winnings = Math.floor(winnings * multiplier);
          payout = winnings + betAmount;
        }
        
        newHand += winnings;
      } else {
        newHand -= betAmount;
        winnings = -betAmount;
      }
      await setUserBalances(userId, newHand, balances.bank);
      const embed = new EmbedBuilder()
        .setTitle('Slots')
        .setColor(payout > 0 ? 0xf1c40f : 0x222222)
        .setDescription(`**${row.join(' | ')}**`)
        .addFields(
          { name: 'Result', value: payout > 0 ? `You win ${payout} ${moneda} (${winType})` : `You lose ${betAmount} ${moneda}`, inline: true },
          { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
        )
        .setFooter({ text: payout > 0 ? 'Congratulations!' : 'Try again!' });
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('spin').setLabel('Spin Again').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('changebet').setLabel('Change Bet').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger)
      );
      // Verificar si podemos responder antes de actualizar
      if (!i.replied && !i.deferred) {
        await i.update({ embeds: [embed], components: [buttons], content: '' });
      }
    } catch (error) {
      console.error('Error in playSpin:', error);
      // Si la interacción ha expirado o ya fue respondida, no hacer nada
      if (error.code === 10062 || error.code === 40060) return;
      try {
        await i.followUp({ content: 'An error occurred. Please try again.', flags: MessageFlags.Ephemeral });
      } catch (e) {
        console.error('Could not send follow-up message:', e);
      }
    }
  }

  // First spin
  const row = getRow();
  let payout = 0;
  let winType = '';
  if (row[0] === row[1] && row[1] === row[2]) {
    payout = bet * 10;
    winType = 'JACKPOT!';
  } else if (row[0] === row[1] || row[1] === row[2] || row[0] === row[2]) {
    payout = bet * 2;
    winType = 'Double!';
  }
  let newHand = balances.hand;
  if (payout > 0) {
    let winnings = payout - bet;
    
    // Aplicar multiplicadores si ganó
    const multiplier = await getCurrentMultiplier(userId);
    if (multiplier > 1) {
      winnings = Math.floor(winnings * multiplier);
      payout = winnings + bet;
    }
    
    newHand += winnings;
  } else {
    newHand -= bet;
  }
  await setUserBalances(userId, newHand, balances.bank);
  
  // Log slots result
  await logGamblingCommand(interaction.user, 'slots', {
    amount: `${bet} ${moneda}`,
    result: `${payout > 0 ? 'WON' : 'LOST'} - Symbols: ${row.join(' ')}`,
    additional: payout > 0 ? `Payout: +${winnings}${multiplier > 1 ? ` (${multiplier}x boost)` : ''}` : `Lost: -${bet}`
  });
  
  const embed = new EmbedBuilder()
    .setTitle('Slots')
    .setColor(payout > 0 ? 0xf1c40f : 0x222222)
    .setDescription(`**${row.join(' | ')}**`)
    .addFields(
      { name: 'Result', value: payout > 0 ? `You win ${payout} ${moneda} (${winType})` : `You lose ${bet} ${moneda}`, inline: true },
      { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
    )
    .setFooter({ text: payout > 0 ? 'Congratulations!' : 'Try again!' });
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('spin').setLabel('Spin Again').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('changebet').setLabel('Change Bet').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger)
  );
  await interaction.reply({ embeds: [embed], components: [buttons] });

  // Collector for buttons - Aumentar tiempo a 10 minutos
  const filter = i => i.user.id === userId;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 }); // 10 minutes
  let currentBet = bet;
  
  collector.on('collect', async i => {
    try {
      // Verificar si la interacción ya fue respondida
      if (i.replied || i.deferred) return;
      
      if (i.customId === 'spin') {
        await playSpin(i, currentBet);
      } else if (i.customId === 'changebet') {
        // Show modal for new bet
        const modal = new ModalBuilder()
          .setCustomId(`slots_changebet_modal_${userId}_${Date.now()}`)
          .setTitle('Change Bet Amount')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('bet_amount')
                .setLabel('Enter new bet amount')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`${minBet} - ${maxBet}`)
                .setRequired(true)
            )
          );
        await i.showModal(modal);
        
        // Handle modal submit immediately
        try {
          const modalInt = await i.awaitModalSubmit({ time: 60000 });
          const newBet = Number(modalInt.fields.getTextInputValue('bet_amount'));
          if (isNaN(newBet) || newBet < minBet || newBet > maxBet) {
            await modalInt.reply({ content: `Invalid bet. Please enter a number between ${minBet} and ${maxBet}.`, flags: MessageFlags.Ephemeral });
            return;
          }
          currentBet = newBet;
          await playSpin(modalInt, currentBet);
        } catch (modalError) {
          console.error('Modal timeout or error:', modalError);
        }
      } else if (i.customId === 'end') {
        // Disable buttons but keep embed
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('spin').setLabel('Spin Again').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('changebet').setLabel('Change Bet').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await i.update({ components: [disabledButtons] });
        collector.stop();
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      if (error.code === 10062) return; // Unknown interaction, already expired
      try {
        if (!i.replied && !i.deferred) {
          await i.reply({ content: 'An error occurred. Please try the command again.', flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        console.error('Could not reply to interaction:', e);
      }
    }
  });

  collector.on('end', async () => {
    try {
      // Disable all buttons when collector ends
      const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('spin').setLabel('Spin Again').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('changebet').setLabel('Change Bet').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger).setDisabled(true)
      );
      const originalMessage = await interaction.fetchReply();
      await interaction.editReply({ components: [disabledButtons] });
    } catch (error) {
      console.error('Error disabling buttons on collector end:', error);
    }
  });
}
