
import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier, hasGuaranteedWin, useGuaranteedWin } from '../db.js';
import { logGamblingCommand, safeInteractionUpdate } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Flip a coin and bet heads, tails, or edge (canto).')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount to bet')
      .setRequired(true)
  );



async function playCoinflipRound(interaction, config, bet, moneda, minBet, maxBet, userId, headstailsPayout = 2, edgePayout = 15) {
  const balances = await getUserBalances(userId);
  const embed = new EmbedBuilder()
    .setTitle('Coinflip')
    .setColor(0x3498db)
    .setDescription(`Choose your side and bet **${bet} ${moneda}**!`)
    .addFields(
      { name: 'Options', value: '🪙 Heads (x2)\n💰 Tails (x2)\n🎲 Edge (x15)', inline: false },
      { name: 'Your Hand', value: `${balances.hand} ${moneda}`, inline: true }
    )
    .setFooter({ text: 'Pick your side below.' });
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('heads').setLabel('Heads').setStyle(ButtonStyle.Primary).setEmoji('🪙'),
    new ButtonBuilder().setCustomId('tails').setLabel('Tails').setStyle(ButtonStyle.Primary).setEmoji('💰'),
    new ButtonBuilder().setCustomId('edge').setLabel('Edge').setStyle(ButtonStyle.Secondary).setEmoji('🎲')
  );
  // Siempre usar reply normal - no editReply sin defer
  await interaction.reply({ embeds: [embed], components: [buttons] });

  const filter = i => i.user.id === userId && ['heads', 'tails', 'edge'].includes(i.customId);
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });
  collector.on('collect', async i => {
    // Verificar garantía de victoria
    const hasGuaranteed = await hasGuaranteedWin(userId);
    
    // Determine result: heads/tails 49.5% each, edge 1%
    const roll = Math.random();
    let result, resultEmoji, payout = 0, win = false;
    
    if (hasGuaranteed) {
      // Si tiene garantía de victoria, forzar la victoria
      result = i.customId;
      await useGuaranteedWin(userId);
    } else {
      // Resultado normal
      if (roll < 0.495) {
        result = 'heads';
      } else if (roll < 0.99) {
        result = 'tails';
      } else {
        result = 'edge';
      }
    }
    
    // Asignar emojis
    if (result === 'heads') resultEmoji = '🪙';
    else if (result === 'tails') resultEmoji = '💰';
    else resultEmoji = '🎲';
    
    if (i.customId === result) {
      win = true;
      payout = result === 'edge' ? bet * edgePayout : bet * headstailsPayout;
    }
    
    // Aplicar multiplicadores si ganó
    const multiplier = await getCurrentMultiplier(userId);
    if (win && multiplier > 1) {
      payout = Math.floor(payout * multiplier);
    }
    
    let newHand = balances.hand;
    if (win) {
      newHand += payout - bet;
    } else {
      newHand -= bet;
    }
    await setUserBalances(userId, newHand, balances.bank);
    
    // Log del comando de gambling
    await logGamblingCommand(interaction.user, 'coinflip', {
      amount: `${bet} ${moneda}`,
      result: `${win ? 'WON' : 'LOST'} - Choice: ${i.customId} | Coin: ${result} | Payout: ${win ? payout - bet : -bet}`,
      additional: hasGuaranteed ? 'Used Lucky Ticket' : undefined
    });
    
    const resultEmbed = new EmbedBuilder()
      .setTitle('Coinflip Result')
      .setColor(win ? 0x00e676 : 0xe74c3c)
      .setDescription(`You chose **${i.customId.charAt(0).toUpperCase() + i.customId.slice(1)}**. The coin landed on **${result.toUpperCase()}** ${resultEmoji}${hasGuaranteed ? '\n\n🎫 **Lucky Ticket** guaranteed your victory!' : ''}`)
      .addFields(
        { name: 'Payout', value: win ? `+${payout - bet} ${moneda}${multiplier > 1 ? ` (${multiplier}x boost!)` : ''}` : `-${bet} ${moneda}`, inline: true },
        { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
      )
      .setFooter({ text: win ? 'Congratulations!' : 'Better luck next time!' });
    // Show play again/end buttons
    const againButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('playagain').setLabel('Play Again').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger)
    );
    await safeInteractionUpdate(i, { embeds: [resultEmbed], components: [againButtons] });

    // Collector for play again/end
    const againFilter = btn => btn.user.id === userId && ['playagain', 'end'].includes(btn.customId);
    const againCollector = i.channel.createMessageComponentCollector({ filter: againFilter, time: 30000, max: 1 });
    againCollector.on('collect', async btn => {
      if (btn.customId === 'playagain') {
        await playCoinflipRound(btn, config, bet, moneda, minBet, maxBet, userId, headstailsPayout, edgePayout);
      } else if (btn.customId === 'end') {
        // Disable buttons
        const disabled = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('playagain').setLabel('Play Again').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('end').setLabel('End Game').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await safeInteractionUpdate(btn, { components: [disabled] });
      }
    });
  });
}

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet');
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.coinflip?.minBet ?? 10;
  const maxBet = config.coinflip?.maxBet ?? 100000;
  const headstailsPayout = config.coinflip?.payouts?.heads_tails ?? 2;
  const edgePayout = config.coinflip?.payouts?.edge ?? 15;
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);
  if (bet < minBet) {
    return interaction.reply({ content: `Minimum bet is ${minBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (bet > maxBet) {
    return interaction.reply({ content: `Maximum bet is ${maxBet} ${moneda}.`, flags: MessageFlags.Ephemeral });
  }
  if (balances.hand < bet) {
    return interaction.reply({ content: `You do not have enough money in hand.`, flags: MessageFlags.Ephemeral });
  }
  await playCoinflipRound(interaction, config, bet, moneda, minBet, maxBet, userId, headstailsPayout, edgePayout);
}
