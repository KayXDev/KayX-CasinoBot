import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-give')
  .setDescription('👑 Admin: Dar dinero a un usuario específico')
  .setDefaultMemberPermissions('0') // Solo administradores
  .addUserOption(option =>
    option.setName('target')
      .setDescription('Usuario al que dar dinero')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Cantidad a dar')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(999999999)
  )
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Dónde depositar: billetera (hand) o banco (bank)')
      .setRequired(true)
      .addChoices(
        { name: 'Billetera (Hand)', value: 'hand' },
        { name: 'Banco (Bank)', value: 'bank' }
      )
  );

export async function execute(interaction) {
  const member = interaction.member;
  const adminRoles = config.adminRoles || [];
  const hasAdminRole = member.roles.cache.some(role => adminRoles.includes(role.id));
  const moneda = config.casino?.moneda || '💰';
  if (!hasAdminRole) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xe74c3c)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
  const target = interaction.options.getUser('target');
  const amount = interaction.options.getInteger('amount');
  const type = interaction.options.getString('type');
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
  await addUserIfNotExists(target.id);
  const balances = await getUserBalances(target.id);
  let newHand = balances.hand;
  let newBank = balances.bank;
  if (type === 'hand') newHand += amount;
  else newBank += amount;
  await setUserBalances(target.id, newHand, newBank);
  
  // Log del comando administrativo
  await logAdminCommand(interaction.user, 'admin-give', {
    amount: `${amount} ${moneda}`,
    target: target.username,
    result: `${type} - Hand: ${newHand} | Bank: ${newBank}`
  });

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Admin Give')
        .setColor(0x9b59b6)
        .setDescription(`Gave **${amount} ${moneda}** to **${target.username}** (${type}).`)
        .addFields(
          { name: 'New Hand', value: `${newHand} ${moneda}`, inline: true },
          { name: 'New Bank', value: `${newBank} ${moneda}`, inline: true }
        )
        .setFooter({ text: 'Casino Bot' })
    ]
  });
}
// ...existing code...
