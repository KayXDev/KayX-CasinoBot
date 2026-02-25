import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getUserBankCapacity, canDeposit } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('deposit')
  .setDescription('Deposit money from your hand to your bank account.')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Amount to deposit')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const amount = interaction.options.getInteger('amount');
  const moneda = interaction.client.config?.casino?.moneda || '💰';
  if (amount <= 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Invalid Deposit Amount')
          .setDescription([
            `**Deposit amount must be greater than zero**`,
            ``,
            `💳 **Requested:** ${amount} ${moneda}`,
            `📊 **Minimum:** 1 ${moneda}`,
            ``,
            `*Please enter a positive amount to deposit.*`
          ].join('\n'))
          .setColor(0xff6b6b)
          .setFooter({ text: '💡 Tip: Use /balance to see your available hand money' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);
  const bankCapacity = await getUserBankCapacity(userId);
  
  if (balances.hand < amount) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Insufficient Hand Funds')
          .setDescription([
            `**Not enough money in your hand**`,
            ``,
            `💳 **Requested:** ${amount.toLocaleString()} ${moneda}`,
            `💰 **Available in Hand:** ${balances.hand.toLocaleString()} ${moneda}`,
            `💸 **Shortfall:** ${(amount - balances.hand).toLocaleString()} ${moneda}`,
            ``,
            `*You can only deposit money you currently have in hand.*`
          ].join('\n'))
          .setColor(0xff6b6b)
          .setFooter({ text: '💡 Tip: Win more money in casino games or ask for /give from friends' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (balances.bank + amount > bankCapacity) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏦 Bank Capacity Exceeded')
          .setDescription([
            `**Your bank vault is nearly full!**`,
            ``,
            `💳 **Requested Deposit:** ${amount.toLocaleString()} ${moneda}`,
            `🏦 **Current Bank Balance:** ${balances.bank.toLocaleString()} ${moneda}`,
            `📊 **Bank Capacity:** ${bankCapacity.toLocaleString()} ${moneda}`,
            `💸 **Available Space:** ${(bankCapacity - balances.bank).toLocaleString()} ${moneda}`,
            ``,
            `🛒 **Upgrade your bank capacity in the \`/shop\`!**`
          ].join('\n'))
          .addFields([
            { 
              name: '💰 Current Bank', 
              value: `${balances.bank.toLocaleString()} ${moneda}`, 
              inline: true 
            },
            { 
              name: '🏛️ Bank Capacity', 
              value: `${bankCapacity.toLocaleString()} ${moneda}`, 
              inline: true 
            },
            { 
              name: '📈 Usage', 
              value: `${((balances.bank / bankCapacity) * 100).toFixed(1)}%`, 
              inline: true 
            }
          ])
          .setColor(0xffa500)
          .setFooter({ text: '💡 Tip: Buy Bank Expansion items in /shop to increase capacity' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  
  await setUserBalances(userId, balances.hand - amount, balances.bank + amount);
  
  const newBankBalance = balances.bank + amount;
  const bankUsagePercent = ((newBankBalance / bankCapacity) * 100).toFixed(1);
  
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🏛️ Bank Deposit | Transaction Complete')
        .setColor(0x1abc9c)
        .setDescription(`**Deposit Successful, ${interaction.user.username}!**\n\n💰 *Your funds are now safely secured in your bank*`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage('https://i.imgur.com/hMwxvcd.png')
        .addFields([
          {
            name: '💰 Transaction Summary',
            value: `\`\`\`💰 Deposit Amount: ${amount.toLocaleString()} ${moneda}\n👤 From: Hand Balance\n🏦 To: Bank Account\n✅ Status: Completed\`\`\``,
            inline: false
          },
          { 
            name: '👤 Current Hand Balance', 
            value: `**${(balances.hand - amount).toLocaleString()} ${moneda}**\n*Available for gambling*`, 
            inline: true 
          },
          { 
            name: '� Current Bank Balance', 
            value: `**${newBankBalance.toLocaleString()} ${moneda}**\n*Safely protected*`, 
            inline: true 
          },
          { 
            name: '� Bank Capacity', 
            value: `**${bankUsagePercent}%**\n*${newBankBalance.toLocaleString()}/${bankCapacity.toLocaleString()} ${moneda}*`, 
            inline: true 
          },
          {
            name: '� Security Benefits',
            value: '```🛡️ Protected from robberies\n💎 Safe storage guarantee\n📈 Secure wealth building\n🎯 Peace of mind```',
            inline: false
          }
        ])
        .setFooter({ 
          text: `Casino Bot • Your money is now safe and protected!`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp()
    ]
  });

  // Log gambling command
  await logGamblingCommand(interaction.user, 'deposit', {
    amount_deposited: amount,
    new_hand_balance: balances.hand - amount,
    new_bank_balance: finalBankAmount
  });
}
// ...existing code...
