import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getSorteoActivo } from '../util/database/loteriaDb.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-loteria-pozo')
  .setDescription('🔒 [ADMIN] Add money to a lottery pot')
  .setDefaultMemberPermissions('0')
  .addStringOption(option =>
    option.setName('tipo')
      .setDescription('Lottery type')
      .setRequired(true)
      .addChoices(
        { name: `${config.loteria?.emojis?.diaria || ''} ${config.loteria?.tipos?.diaria?.nombre || 'Diaria'}`, value: 'diaria' },
        { name: `${config.loteria?.emojis?.semanal || ''} ${config.loteria?.tipos?.semanal?.nombre || 'Semanal'}`, value: 'semanal' },
        { name: `${config.loteria?.emojis?.mensual || ''} ${config.loteria?.tipos?.mensual?.nombre || 'Mensual'}`, value: 'mensual' }
      ))
  .addIntegerOption(option =>
    option.setName('cantidad')
      .setDescription('Amount to add to the pot')
      .setRequired(true)
      .setMinValue(config.loteria?.limites?.min_aporte_admin || 1000));

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo');
  const cantidad = interaction.options.getInteger('cantidad');
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

  await logAdminCommand(interaction.user.id, 'admin-loteria-pozo', { tipo, cantidad });

  try {
    // Verificar si hay sorteo activo del tipo especificado
    const sorteoActivo = await getSorteoActivo(tipo);
    
    if (!sorteoActivo) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`${config.loteria?.emojis?.error || '❌'} No Active Lottery`)
            .setDescription(`There is no active ${tipo} lottery to add money to.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Importar la función de base de datos para actualizar el pozo
    const { anadirDineroPozo } = await import('../util/database/loteriaDb.js');
    
    // Añadir dinero al pozo
    await anadirDineroPozo(tipo, cantidad);

    // Obtener el sorteo actualizado
    const sorteoActualizado = await getSorteoActivo(tipo);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${config.loteria?.emojis?.pozo || '💰'} Pot Updated`)
      .setDescription([
        `**${cantidad.toLocaleString()} ${moneda}** has been added to the **${tipo}** lottery pot.`,
        '',
        `${config.loteria?.emojis?.antes || '📊'} **Previous pot:** ${(sorteoActualizado.pozo_total - cantidad).toLocaleString()} ${moneda}`,
        `${config.loteria?.emojis?.despues || '💎'} **New pot:** ${sorteoActualizado.pozo_total.toLocaleString()} ${moneda}`,
        `${config.loteria?.emojis?.fecha || '📅'} **Draw date:** <t:${Math.floor(new Date(sorteoActualizado.fecha_sorteo).getTime() / 1000)}:F>`
      ].join('\n'))
      .addFields([
        { 
          name: `${config.loteria?.emojis?.boletos || '🎫'} Active Tickets`, 
          value: `${sorteoActualizado.tickets_vendidos || 0}`, 
          inline: true 
        },
        { 
          name: `${config.loteria?.emojis?.aumentado || '📈'} Added`, 
          value: `${cantidad.toLocaleString()} ${moneda}`, 
          inline: true 
        },
        { 
          name: `${config.loteria?.emojis?.total || '💎'} Total Pot`, 
          value: `${sorteoActualizado.pozo_total.toLocaleString()} ${moneda}`, 
          inline: true 
        }
      ])
      .setTimestamp()
      .setFooter({ text: `Added by ${interaction.user.tag}` });

    await interaction.reply({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error in admin-loteria-pozo:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription(`Error adding money to pot: ${error.message}`)
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}