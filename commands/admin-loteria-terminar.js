import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { ejecutarSorteo, getSorteoActivo } from '../util/database/loteriaDb.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-loteria-terminar')
  .setDescription('🔒 [ADMIN] End active lottery and choose winner')
  .setDefaultMemberPermissions('0')
  .addStringOption(option =>
    option.setName('tipo')
      .setDescription('Tipo de sorteo a terminar')
      .setRequired(true)
      .addChoices(
        { name: `${config.loteria?.emojis?.diaria || ''} ${config.loteria?.tipos?.diaria?.nombre || 'Diaria'}`, value: 'diaria' },
        { name: `${config.loteria?.emojis?.semanal || ''} ${config.loteria?.tipos?.semanal?.nombre || 'Semanal'}`, value: 'semanal' },
        { name: `${config.loteria?.emojis?.mensual || ''} ${config.loteria?.tipos?.mensual?.nombre || 'Mensual'}`, value: 'mensual' }
      ));

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo');
  const moneda = config?.casino?.moneda || '💰';

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

  await logAdminCommand(interaction.user.id, 'admin-loteria-terminar', { tipo });

  try {
    // Verificar si hay sorteo activo del tipo especificado
    const sorteoActivo = await getSorteoActivo(tipo);
    
    if (!sorteoActivo) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`${config.loteria?.emojis?.error || '❌'} No Active Lottery`)
            .setDescription(`There is no active ${tipo} lottery to end.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Crear botones de confirmación
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_terminar_${tipo}`)
          .setLabel('✅ Confirm End')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_terminar_${tipo}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

    const embed = new EmbedBuilder()
      .setColor('#FFD93D')
      .setTitle(`${config.loteria?.emojis?.confirmar || '⚠️'} Confirm Lottery End`)
      .setDescription(`**Are you sure you want to end the active lottery?**\n\n${config.loteria?.emojis?.pozo || ''} **Current pot:** ${sorteoActivo.pozo_total.toLocaleString()} ${moneda}\n${config.loteria?.emojis?.fecha || ''} **Scheduled draw:** <t:${Math.floor(new Date(sorteoActivo.fecha_sorteo).getTime() / 1000)}:F>`)
      .setFooter({ text: 'This action cannot be undone' });

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    // Collector para los botones
    const collectorFilter = i => i.user.id === interaction.user.id;
    
    try {
      const confirmation = await response.awaitMessageComponent({ 
        filter: collectorFilter, 
        time: 60000 
      });

      if (confirmation.customId === `confirm_terminar_${tipo}`) {
        // Ejecutar el sorteo
        const resultado = await ejecutarSorteo(tipo);
        
        await confirmation.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle(`${config.loteria?.emojis?.winner || '🎉'} Lottery Ended Successfully`)
              .setDescription(`The ${tipo} lottery has been ended.\n\n**Winner:** <@${resultado.ganador_id}>\n**Prize:** ${resultado.premio.toLocaleString()} ${moneda}`)
          ],
          components: []
        });
      } else {
        await confirmation.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#6C757D')
              .setTitle('❌ Action Cancelled')
              .setDescription('The lottery end has been cancelled.')
          ],
          components: []
        });
      }
    } catch (e) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏰ Time Expired')
            .setDescription('The confirmation has expired.')
        ],
        components: []
      });
    }

  } catch (error) {
    console.error('Error in admin-loteria-terminar:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription(`Error ending lottery: ${error.message}`)
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}