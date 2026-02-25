// ═══════════════════════════════════════════════════════════════
// 💔 REMOVE FRIEND COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { removeFriendship, checkFriendshipStatus, getUserFriends } from '../util/database/friendsDb.js';
import { addUserIfNotExists } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logGamblingCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('removefriend')
  .setDescription('Elimina un amigo de tu lista')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El amigo que quieres eliminar de tu lista')
      .setRequired(true));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('usuario');
    const userId = interaction.user.id;
    const friendId = targetUser.id;

    // ═══════════════════════════════════════════════════════════════
    // 🛡️ VALIDACIONES INICIALES
    // ═══════════════════════════════════════════════════════════════

    // Verificar que no sea un bot
    if (targetUser.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🤖 Error | Usuario Inválido')
            .setColor(0xe74c3c)
            .setDescription('**Los bots no pueden estar en tu lista de amigos**\n\n🚫 *No es posible eliminar bots*')
            .setThumbnail('https://i.imgur.com/X8hdUPv.png')
            .addFields([
              {
                name: '💡 Sugerencia',
                value: '```Solo puedes eliminar usuarios reales\nde tu lista de amigos```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Solo usuarios reales en lista de amigos',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Verificar que no se auto-elimine
    if (userId === friendId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🤔 Error | Auto-Eliminación')
            .setColor(0xe74c3c)
            .setDescription('**No puedes eliminarte a ti mismo**\n\n😅 *¡Siempre serás tu mejor amigo!*')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
              {
                name: '💡 ¿Qué hacer?',
                value: '```Selecciona un amigo diferente\npara eliminar de tu lista```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Elimina otros usuarios de tu lista',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Asegurar que ambos usuarios existen en la base de datos
    await addUserIfNotExists(userId);
    await addUserIfNotExists(friendId);

    // ═══════════════════════════════════════════════════════════════
    // 🔍 VERIFICAR ESTADO DE AMISTAD
    // ═══════════════════════════════════════════════════════════════

    const friendshipStatus = await checkFriendshipStatus(userId, friendId);

    if (!friendshipStatus.areFriends) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ No son Amigos')
            .setColor(0xe74c3c)
            .setDescription(`**${targetUser.username} no está en tu lista de amigos**\n\n💔 *No hay amistad que eliminar*`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
              {
                name: '🔍 Estado Actual',
                value: friendshipStatus.hasPendingRequest 
                  ? '```⏳ Hay una solicitud pendiente\n💭 Pero aún no son amigos\n🤝 Espera a que se acepte```'
                  : '```❌ Sin conexión entre ustedes\n➕ Puedes enviar solicitud\n🎯 O buscar en tu lista real```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Verifica tu lista de amigos',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ⚠️ CONFIRMACIÓN DE ELIMINACIÓN
    // ═══════════════════════════════════════════════════════════════

    const confirmEmbed = new EmbedBuilder()
      .setTitle('💔 Confirmar Eliminación de Amistad')
      .setColor(0xf39c12)
      .setDescription(`**¿Estás seguro de eliminar a ${targetUser.username}?**\n\n⚠️ *Esta acción no se puede deshacer fácilmente*`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields([
        {
          name: '📋 Detalles de la Amistad',
          value: `\`\`\`👤 Amigo: ${targetUser.username}\n🏷️ ID: ${targetUser.id}\n💔 Acción: Eliminar de lista\n⚠️ Impacto: Permanente\`\`\``,
          inline: false
        },
        {
          name: '🚨 Consecuencias',
          value: '```❌ Se eliminará de ambas listas\n🔄 Necesitarán reconectarse\n📤 Nueva solicitud requerida\n💔 Historial se pierde```',
          inline: true
        },
        {
          name: '🔄 Para Reconectar',
          value: '```➕ Enviar nueva solicitud\n✅ Esperar aceptación\n🤝 Reconstruir amistad\n⏰ Proceso completo otra vez```',
          inline: true
        }
      ])
      .setFooter({ 
        text: 'Casino Bot • ¿Confirmas eliminar esta amistad?',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Botones de confirmación
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_remove')
      .setLabel('Sí, Eliminar Amistad')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('💔');

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_remove')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');

    const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    // Log gambling command
    await logGamblingCommand(interaction.user, 'removefriend', {
      action: 'executed'
    });

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [actionRow]
    });

    const response = await interaction.fetchReply();

    // ═══════════════════════════════════════════════════════════════
    // 🎛️ COLLECTOR PARA MANEJAR CONFIRMACIÓN
    // ═══════════════════════════════════════════════════════════════

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000 // 30 segundos para decidir
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: '❌ Solo el usuario que ejecutó el comando puede confirmar esta acción',
          flags: MessageFlags.Ephemeral
        });
      }

      const action = buttonInteraction.customId;

      if (action === 'confirm_remove') {
        // ═══════════════════════════════════════════════════════════════
        // 💔 EJECUTAR ELIMINACIÓN
        // ═══════════════════════════════════════════════════════════════

        try {
          const result = await removeFriendship(userId, friendId);

          if (result.success) {
            const successEmbed = new EmbedBuilder()
              .setTitle('💔 Amistad Eliminada')
              .setColor(0x95a5a6)
              .setDescription(`**${targetUser.username} ha sido eliminado de tu lista de amigos**\n\n💭 *Amistad terminada exitosamente*`)
              .setThumbnail(targetUser.displayAvatarURL())
              .setImage('https://i.imgur.com/hMwxvcd.png')
              .addFields([
                {
                  name: '✅ Acción Completada',
                  value: `\`\`\`💔 Usuario eliminado: ${targetUser.username}\n📅 Fecha: ${new Date().toLocaleString('es-ES')}\n🔄 Estado: Desconectados\n✨ Proceso: Exitoso\`\`\``,
                  inline: false
                },
                {
                  name: '🔄 ¿Qué Sigue?',
                  value: '```➕ Puedes agregar nuevos amigos\n👥 Usa /friends para ver tu lista\n🎯 Explora nuevas conexiones\n🤝 Haz amigos en el casino```',
                  inline: true
                },
                {
                  name: '💡 Para Reconectar',
                  value: '```📤 Envía nueva solicitud\n⏰ Espera aceptación\n🤝 Reconstruye la amistad\n✨ ¡Dale otra oportunidad!```',
                  inline: true
                }
              ])
              .setFooter({ 
                text: 'Casino Bot • Amistad eliminada correctamente',
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();

            await buttonInteraction.update({
              embeds: [successEmbed],
              components: []
            });
          } else {
            const errorEmbed = new EmbedBuilder()
              .setTitle('❌ Error al Eliminar Amistad')
              .setColor(0xe74c3c)
              .setDescription(`**${result.message}**\n\n🔄 *Intenta nuevamente*`)
              .setThumbnail('https://i.imgur.com/X8hdUPv.png')
              .addFields([
                {
                  name: '🛠️ Posibles Causas',
                  value: '```🔄 Error temporal del servidor\n📡 Problemas de conexión\n⚡ Estado de amistad cambió\n🔧 Intenta en unos momentos```',
                  inline: false
                }
              ])
              .setFooter({ 
                text: 'Casino Bot • Error técnico',
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();

            await buttonInteraction.update({
              embeds: [errorEmbed],
              components: []
            });
          }
        } catch (error) {
          console.error('Error removing friendship:', error);
          
          const criticalErrorEmbed = new EmbedBuilder()
            .setTitle('🔥 Error Crítico')
            .setColor(0x992d22)
            .setDescription('**Error inesperado al eliminar la amistad**\n\n⚠️ *Contacta al administrador*')
            .setThumbnail('https://i.imgur.com/X8hdUPv.png')
            .addFields([
              {
                name: '🚨 Error Técnico',
                value: '```Sistema temporalmente no disponible\nIntenta más tarde o contacta soporte```',
                inline: false
              }
            ])
            .setFooter({ text: 'Casino Bot • Error del sistema' });

          await buttonInteraction.update({
            embeds: [criticalErrorEmbed],
            components: []
          });
        }

      } else {
        // ═══════════════════════════════════════════════════════════════
        // ❌ CANCELAR ELIMINACIÓN
        // ═══════════════════════════════════════════════════════════════

        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Eliminación Cancelada')
          .setColor(0x1abc9c)
          .setDescription(`**Amistad con ${targetUser.username} conservada**\n\n💚 *¡Buena decisión! La amistad permanece intacta*`)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields([
            {
              name: '🤝 Amistad Mantenida',
              value: `\`\`\`👫 ${targetUser.username} sigue en tu lista\n💚 Conexión preservada\n🎮 Pueden seguir jugando juntos\n✨ Amistad intacta\`\`\``,
              inline: false
            },
            {
              name: '🎯 Opciones Disponibles',
              value: '```👥 Ver lista completa con /friends\n🎮 Jugar juntos en el casino\n💬 Seguir interactuando\n🏆 Competir en rankings```',
              inline: false
            }
          ])
          .setFooter({ 
            text: 'Casino Bot • ¡Las buenas amistades se conservan!',
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();

        await buttonInteraction.update({
          embeds: [cancelEmbed],
          components: []
        });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        // Si no se recolectó ninguna interacción (timeout)
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏰ Tiempo Agotado')
            .setColor(0x95a5a6)
            .setDescription('**La confirmación expiró**\n\n💭 *No se realizó ningún cambio*')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
              {
                name: '✅ Estado Actual',
                value: `\`\`\`👫 ${targetUser.username} sigue siendo tu amigo\n💚 Amistad intacta por timeout\n🔄 Usa el comando nuevamente si necesitas\n⏰ Confirma más rápido la próxima vez\`\`\``,
                inline: false
              }
            ])
            .setFooter({ text: 'Casino Bot • Sin cambios realizados' });

          const disabledRow = new ActionRowBuilder().addComponents(
            confirmButton.setDisabled(true),
            cancelButton.setDisabled(true)
          );

          await response.edit({
            embeds: [timeoutEmbed],
            components: [disabledRow]
          });
        } catch (error) {
          console.error('Error handling timeout:', error);
        }
      }
    });
}