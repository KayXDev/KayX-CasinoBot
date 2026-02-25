// ═══════════════════════════════════════════════════════════════
// 🧹 ADMIN LOTERIA CLEANUP COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { limpiarBoletosCorruptos } from '../util/database/loteriaDb.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-loteria-cleanup')
  .setDescription('🧹 Limpiar boletos de lotería con datos JSON corruptos')
  .setDefaultMemberPermissions('0');

export async function execute(interaction) {
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

  // Defer la respuesta porque puede tomar tiempo
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Ejecutar limpieza
    const resultado = await limpiarBoletosCorruptos();

    // Log del comando admin
    await logAdminCommand(interaction.user, 'admin-loteria-cleanup', {
      resultado: `Arreglados: ${resultado.arreglados}, Eliminados: ${resultado.eliminados}`
    });

    // Crear embed con los resultados
    const resultEmbed = new EmbedBuilder()
      .setTitle('🧹 Limpieza de Lotería Completada')
      .setColor(0x00ff00)
      .setDescription('**Proceso de limpieza de datos corruptos finalizado**\n\n✨ *Los boletos con datos inválidos han sido procesados*')
      .addFields([
        {
          name: '📊 Resultados',
          value: `\`\`\`🔧 Boletos arreglados: ${resultado.arreglados}\n🗑️ Boletos eliminados: ${resultado.eliminados}\n📝 Total procesados: ${resultado.arreglados + resultado.eliminados}\`\`\``,
          inline: false
        }
      ])
      .setFooter({ 
        text: 'Casino Bot • Admin Panel', 
        iconURL: interaction.client.user.displayAvatarURL() 
      })
      .setTimestamp();

    if (resultado.arreglados + resultado.eliminados === 0) {
      resultEmbed
        .setColor(0x00aa00)
        .setDescription('**No se encontraron boletos corruptos**\n\n✅ *Todos los datos de lotería están en buen estado*');
    } else if (resultado.arreglados > 0) {
      resultEmbed.addFields([
        {
          name: '🔧 Boletos Arreglados',
          value: `Se lograron recuperar **${resultado.arreglados}** boletos extrayendo los números válidos de datos parcialmente corruptos`,
          inline: false
        }
      ]);
    }

    if (resultado.eliminados > 0) {
      resultEmbed.addFields([
        {
          name: '🗑️ Boletos Eliminados', 
          value: `Se eliminaron **${resultado.eliminados}** boletos con datos irrecuperables para evitar errores en futuros sorteos`,
          inline: false
        }
      ]);
    }

    await interaction.editReply({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Error en admin-loteria-cleanup:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en Limpieza')
      .setColor(0xff0000)
      .setDescription('**Hubo un error durante el proceso de limpieza**\n\n🔧 *Revisa los logs del servidor para más detalles*')
      .addFields([
        {
          name: '🐛 Error Details',
          value: `\`\`\`${error.message.slice(0, 1000)}\`\`\``,
          inline: false
        }
      ])
      .setFooter({ text: 'Casino Bot • Admin Panel' })
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}