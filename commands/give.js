import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('give')
  .setDescription('Give money from your hand to another user.')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('User to give money to')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Amount to give')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const amount = interaction.options.getInteger('amount');
  const moneda = interaction.client.config?.casino?.moneda || '💰';
  if (amount <= 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Give Failed')
          .setDescription('Amount must be greater than 0.')
          .setColor(0xe74c3c)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  if (target.id === userId) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Give Failed')
          .setDescription('You cannot give money to yourself.')
          .setColor(0xe74c3c)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  await addUserIfNotExists(userId);
  await addUserIfNotExists(target.id);
  const balances = await getUserBalances(userId);
  if (balances.hand < amount) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Give Failed')
          .setDescription('You do not have enough money in hand.')
          .setColor(0xe74c3c)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  const targetBalances = await getUserBalances(target.id);
  await setUserBalances(userId, balances.hand - amount, balances.bank);
  await setUserBalances(target.id, targetBalances.hand + amount, targetBalances.bank);
  

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Money Sent')
        .setColor(0x3498db)
        .setDescription(`You gave **${amount} ${moneda}** to **${target.username}**.`)
        .addFields(
          { name: 'Your New Hand', value: `${balances.hand - amount} ${moneda}`, inline: true },
          { name: `${target.username}'s New Hand`, value: `${targetBalances.hand + amount} ${moneda}`, inline: true }
        )
        .setFooter({ text: 'Casino Bot' })
    ]
  });

  // Log gambling command
  await logGamblingCommand(interaction.user, 'give', {
    target_user: target.username,
    amount_given: amount,
    remaining_balance: balances.hand - amount
  });
}
// ...existing code...
