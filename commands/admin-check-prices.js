import {  SlashCommandBuilder , MessageFlags } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logAdminCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export default {
  data: new SlashCommandBuilder()
    .setName('admin-check-prices')
    .setDescription('🔧 [ADMIN] Verificar y corregir precios de crypto en la base de datos')
    .setDefaultMemberPermissions('0'),

  async execute(interaction) {
    // Verificar que solo el owner puede usar este comando
    const ownerID = config.ownerID;
    if (interaction.user.id !== ownerID) {
      const noPermEmbed = new EmbedBuilder()
        .setTitle('❌ Access Denied')
        .setColor(0xff0000)
        .setDescription('**You do not have permission to use this command**\n\n🔒 *This command is restricted to the bot owner only*')
        .setFooter({ text: 'Casino Bot • Owner Only Command' })
        .setTimestamp();

      return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    try {
      const { pool } = await import('../db.js');
      
      // Obtener precios actuales de la base de datos
      const [cryptos] = await pool.execute(
        'SELECT id, name, symbol, current_price, base_price FROM casino_cryptos'
      );

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔧 Estado Actual de Precios en Base de Datos')
        .setTimestamp();

      let description = '**Precios Actuales vs Configuración:**\n\n';
      const cryptoConfig = config.crypto?.cryptocurrencies || {};

      for (const crypto of cryptos) {
        const configPrice = cryptoConfig[crypto.symbol]?.basePrice || 'No configurado';
        
        description += `**${crypto.name} (${crypto.symbol})**\n`;
        description += `• DB Actual: $${crypto.current_price?.toLocaleString() || 'NULL'}\n`;
        description += `• DB Base: $${crypto.base_price?.toLocaleString() || 'NULL'}\n`;
        description += `• Config.yml: $${typeof configPrice === 'number' ? configPrice.toLocaleString() : configPrice}\n\n`;
      }

      embed.setDescription(description);

      await interaction.editReply({ embeds: [embed] });

      // Log admin command
      await logAdminCommand(interaction.user, 'admin-check-prices', {
        cryptos_checked: Object.keys(config.crypto.cryptos).length,
        discrepancies_found: description.includes('MISMATCH') ? 'Yes' : 'No'
      });

    } catch (error) {
      console.error('Error checking prices:', error);
      await interaction.editReply({
        content: '❌ Error al verificar precios: ' + error.message
      });
    }
  },
};