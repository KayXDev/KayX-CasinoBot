import {  SlashCommandBuilder , MessageFlags } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logAdminCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export default {
  data: new SlashCommandBuilder()
    .setName('admin-reset-prices')
    .setDescription('🔧 [ADMIN] Resetear precios de crypto a los valores de config.yml')
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
      const cryptoConfig = config.crypto?.cryptocurrencies || {};
      
      let updatedCount = 0;
      let description = '**Precios Actualizados:**\n\n';

      for (const [symbol, cryptoData] of Object.entries(cryptoConfig)) {
        if (cryptoData.basePrice) {
          // Actualizar precio en la base de datos
          const [result] = await pool.execute(
            'UPDATE casino_cryptos SET current_price = ?, base_price = ? WHERE symbol = ?',
            [cryptoData.basePrice, cryptoData.basePrice, symbol]
          );

          if (result.affectedRows > 0) {
            updatedCount++;
            description += `✅ **${cryptoData.name} (${symbol})**: $${cryptoData.basePrice.toLocaleString()}\n`;
          }
        }
      }

      // Reinicializar el market engine
      const marketEngineModule = await import('../util/crypto/marketEngine.js');
      const marketEngine = marketEngineModule.default;
      await marketEngine.loadCryptoData();

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔧 Precios Reseteados Exitosamente')
        .setDescription(description + `\n**Total actualizado:** ${updatedCount} criptomonedas`)
        .addFields({
          name: '🔄 Estado del Sistema',
          value: 'Market Engine reinicializado con nuevos precios',
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log admin command
      await logAdminCommand(interaction.user, 'admin-reset-prices', {
        cryptos_updated: updatedCount,
        action: 'reset_prices'
      });

    } catch (error) {
      console.error('Error resetting prices:', error);
      await interaction.editReply({
        content: '❌ Error al resetear precios: ' + error.message
      });
    }
  },
};