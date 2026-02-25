import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('withdraw')
  .setDescription('Withdraw money from your bank to your hand.')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Amount to withdraw')
      .setRequired(true)
  );

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const amount = interaction.options.getInteger('amount');
  const moneda = config?.casino?.moneda || '💰';
  const min = config?.withdraw?.min ?? 1;
  const max = config?.withdraw?.max ?? 1000000;
  if (amount < min) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Withdrawal Rejected')
          .setDescription([
            `**Minimum withdrawal amount not met**`,
            ``,
            `💳 **Requested:** ${amount.toLocaleString()} ${moneda}`,
            `📊 **Minimum Required:** ${min.toLocaleString()} ${moneda}`,
            ``,
            `*Please withdraw at least ${min.toLocaleString()} ${moneda} to proceed.*`
          ].join('\n'))
          .setColor(0xff6b6b)
          .setFooter({ text: '💡 Tip: Check /balance to see your available funds' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  if (amount > max) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Withdrawal Rejected')
          .setDescription([
            `**Maximum withdrawal limit exceeded**`,
            ``,
            `💳 **Requested:** ${amount.toLocaleString()} ${moneda}`,
            `📊 **Maximum Allowed:** ${max.toLocaleString()} ${moneda}`,
            ``,
            `*Please withdraw no more than ${max.toLocaleString()} ${moneda} per transaction.*`
          ].join('\n'))
          .setColor(0xff6b6b)
          .setFooter({ text: '💡 Tip: You can make multiple smaller withdrawals' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);
  if (balances.bank < amount) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Insufficient Bank Funds')
          .setDescription([
            `**Not enough money in your bank account**`,
            ``,
            `💳 **Requested:** ${amount.toLocaleString()} ${moneda}`,
            `🏦 **Available in Bank:** ${balances.bank.toLocaleString()} ${moneda}`,
            `💸 **Shortfall:** ${(amount - balances.bank).toLocaleString()} ${moneda}`,
            ``,
            `*You can only withdraw what you have stored in your bank.*`
          ].join('\n'))
          .setColor(0xff6b6b)
          .setFooter({ text: '💡 Tip: Use /balance to check your current funds' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  await setUserBalances(userId, balances.hand + amount, balances.bank - amount);
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🏛️ Bank Withdrawal | Transaction Complete')
        .setColor(0x1abc9c)
        .setDescription(`**Withdrawal Successful, ${interaction.user.username}!**\n\n💸 *Your funds have been safely transferred to your hand*`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage('https://i.imgur.com/hMwxvcd.png')
        .addFields([
          {
            name: '💰 Transaction Summary',
            value: `\`\`\`💸 Withdrawal Amount: ${amount.toLocaleString()} ${moneda}\n🏦 From: Bank Account\n👤 To: Hand Balance\n✅ Status: Completed\`\`\``,
            inline: false
          },
          { 
            name: '💰 Current Hand Balance', 
            value: `**${(balances.hand + amount).toLocaleString()} ${moneda}**\n*Available for gambling*`, 
            inline: true 
          },
          { 
            name: '🏦 Current Bank Balance', 
            value: `**${(balances.bank - amount).toLocaleString()} ${moneda}**\n*Safely stored*`, 
            inline: true 
          },
          { 
            name: '� Total Wealth', 
            value: `**${(balances.hand + balances.bank).toLocaleString()} ${moneda}**\n*Combined assets*`, 
            inline: true 
          },
          {
            name: '🎯 What\'s Next?',
            value: '```🎰 Try casino games\n🎲 Play special games\n🛒 Visit the shop\n📊 Check leaderboards```',
            inline: false
          }
        ])
        .setFooter({ 
          text: `Casino Bot • Transaction completed • Ready to play!`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp()
    ]
  });

  // Log gambling command
  await logGamblingCommand(interaction.user, 'withdraw', {
    amount_withdrawn: amount,
    new_hand_balance: balances.hand + amount,
    new_bank_balance: balances.bank - amount
  });
}
// ...existing code...
