
import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier, hasGuaranteedWin, useGuaranteedWin } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('dice')
  .setDescription('Roll the dice and bet your virtual money.')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount to bet')
      .setRequired(true)
  );

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet');
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.dice?.minBet ?? 10;
  const maxBet = config.dice?.maxBet ?? 100000;
  const sixMultiplier = config.dice?.payouts?.six ?? 5;
  const fourFiveMultiplier = config.dice?.payouts?.four_five ?? 2;
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
  // Verificar garantía de victoria
  const hasGuaranteed = await hasGuaranteedWin(userId);
  
  // Roll dice
  let dice;
  if (hasGuaranteed) {
    dice = 6; // Forzar victoria con el máximo payout
    await useGuaranteedWin(userId);
  } else {
    dice = Math.floor(Math.random() * 6) + 1;
  }
  
  let payout = 0;
  let resultText = '';
  if (dice === 6) {
    payout = bet * sixMultiplier;
    resultText = `🎉 You rolled a **6**! Big win!`;
  } else if (dice === 4 || dice === 5) {
    payout = bet * fourFiveMultiplier;
    resultText = `✨ You rolled a **${dice}**! Small win!`;
  } else {
    resultText = `😢 You rolled a **${dice}**. You lose!`;
  }
  
  // Aplicar multiplicadores si ganó
  const multiplier = await getCurrentMultiplier(userId);
  if (payout > 0 && multiplier > 1) {
    payout = Math.floor(payout * multiplier);
  }
  
  let newHand = balances.hand;
  if (payout > 0) {
    newHand += payout - bet;
  } else {
    newHand -= bet;
  }
  await setUserBalances(userId, newHand, balances.bank);
  
  // Log dice result
  await logGamblingCommand(interaction.user, 'dice', {
    amount: `${bet} ${moneda}`,
    result: `${payout > 0 ? 'WON' : 'LOST'} - Rolled: ${dice} | Payout: ${payout > 0 ? `+${payout - bet}` : `-${bet}`}`,
    additional: hasGuaranteed ? 'Used Lucky Ticket' : undefined
  });
  
  const embed = new EmbedBuilder()
    .setTitle('Dice Roll')
    .setColor(payout > 0 ? 0x00e676 : 0xe74c3c)
    .setDescription(`${resultText}${hasGuaranteed ? '\n\n🎫 **Lucky Ticket** guaranteed your victory!' : ''}`)
    .addFields(
      { name: 'Payout Structure', value: '6 = x5 | 4/5 = x2 | 1-3 = lose', inline: false },
      { name: 'Result', value: payout > 0 ? `You win ${payout} ${moneda}${multiplier > 1 ? ` (${multiplier}x boost!)` : ''}` : `You lose ${bet} ${moneda}`, inline: true },
      { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true }
    )
    .setFooter({ text: payout > 0 ? 'Nice roll!' : 'Try again!' });
  await interaction.reply({ embeds: [embed] });
}
