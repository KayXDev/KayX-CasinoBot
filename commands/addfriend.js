// ═══════════════════════════════════════════════════════════════
// 👥 ADD FRIEND COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { sendFriendRequest, checkFriendshipStatus } from '../util/database/friendsDb.js';
import { addUserIfNotExists } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('addfriend')
  .setDescription('Envía una solicitud de amistad a otro usuario')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El usuario al que quieres enviar una solicitud de amistad')
      .setRequired(true));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('usuario');
    const senderId = interaction.user.id;
    const receiverId = targetUser.id;

    // ═══════════════════════════════════════════════════════════════
    // 🛡️ VALIDACIONES INICIALES
    // ═══════════════════════════════════════════════════════════════

    // Verificar que no sea un bot
    if (targetUser.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🤖 Error | Invitación Inválida')
            .setColor(0xe74c3c)
            .setDescription('**No puedes enviar solicitudes de amistad a bots**\n\n🚫 *Los bots no pueden ser tus amigos en el casino*')
            .setThumbnail('https://i.imgur.com/X8hdUPv.png')
            .addFields([
              {
                name: '💡 Sugerencia',
                value: '```Busca otros jugadores reales del casino\npara hacer nuevos amigos```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Solo usuarios reales pueden ser amigos',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Verificar que no se auto-invite
    if (senderId === receiverId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🤔 Error | Auto-Invitación')
            .setColor(0xe74c3c)
            .setDescription('**No puedes enviarte una solicitud a ti mismo**\n\n😅 *¡Ya eres tu mejor amigo!*')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
              {
                name: '💡 ¿Qué hacer?',
                value: '```Busca otros usuarios del servidor\npara expandir tu red de amigos```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Encuentra nuevos amigos en el servidor',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Asegurar que ambos usuarios existen en la base de datos
    await addUserIfNotExists(senderId);
    await addUserIfNotExists(receiverId);

    // ═══════════════════════════════════════════════════════════════
    // 🔍 VERIFICAR ESTADO DE AMISTAD
    // ═══════════════════════════════════════════════════════════════

    const friendshipStatus = await checkFriendshipStatus(senderId, receiverId);

    // Ya son amigos
    if (friendshipStatus.areFriends) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('👫 Ya son Amigos!')
            .setColor(0x1abc9c)
            .setDescription(`**Ya eres amigo de ${targetUser.username}**\n\n💚 *Su amistad ya está establecida*`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
              {
                name: '🎯 Opciones Disponibles',
                value: '```🎮 Jugar juntos en el casino\n📊 Ver sus estadísticas\n💬 Interactuar en juegos\n🎲 Competir en partidas```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • ¡Disfruten su amistad!',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Ya hay solicitud pendiente
    if (friendshipStatus.hasPendingRequest) {
      const isYourRequest = friendshipStatus.whoSentRequest === senderId;
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⏳ Solicitud Pendiente')
            .setColor(0xf39c12)
            .setDescription(isYourRequest 
              ? `**Ya enviaste una solicitud a ${targetUser.username}**\n\n⏳ *Esperando respuesta...*`
              : `**${targetUser.username} ya te envió una solicitud**\n\n💡 *¡Ve a /friends para gestionarla!*`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
              {
                name: isYourRequest ? '⏰ Estado' : '🎯 Acción Requerida',
                value: isYourRequest 
                  ? '```⌛ Esperando que acepte\n💭 Sé paciente\n🤝 Pronto serán amigos```'
                  : '```📥 Tienes una solicitud pendiente\n✅ Usa /friends para aceptar\n❌ O rechazar si prefieres```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Gestiona tus solicitudes de amistad',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 📤 ENVIAR SOLICITUD DE AMISTAD
    // ═══════════════════════════════════════════════════════════════

    const result = await sendFriendRequest(senderId, receiverId);

    if (!result.success) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Error al Enviar Solicitud')
            .setColor(0xe74c3c)
            .setDescription(`**${result.message}**\n\n🔄 *Intenta nuevamente más tarde*`)
            .setThumbnail('https://i.imgur.com/X8hdUPv.png')
            .addFields([
              {
                name: '🛠️ Posibles Causas',
                value: '```🔄 Error temporal del servidor\n📡 Problemas de conexión\n⚡ Intenta en unos momentos```',
                inline: false
              }
            ])
            .setFooter({ 
              text: 'Casino Bot • Error técnico',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ SOLICITUD ENVIADA EXITOSAMENTE
    // ═══════════════════════════════════════════════════════════════

    // Log gambling command
    await logGamblingCommand(interaction.user, 'addfriend', {
      target_user: targetUser.username,
      target_id: targetUser.id,
      request_status: 'sent'
    });

    // Respuesta privada al usuario que envió la solicitud
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📤 Solicitud de Amistad Enviada!')
          .setColor(0x1abc9c)
          .setDescription(`**Solicitud enviada a ${targetUser.username}**\n\n🎯 *Esperando su respuesta...*`)
          .setThumbnail(targetUser.displayAvatarURL())
          .setImage('https://i.imgur.com/hMwxvcd.png')
          .addFields([
            {
              name: '📋 Detalles de la Solicitud',
              value: `\`\`\`👤 Para: ${targetUser.username}\n📅 Enviado: ${new Date().toLocaleString('es-ES')}\n⏳ Estado: Pendiente de respuesta\n🎲 Contexto: Casino Bot\`\`\``,
              inline: false
            },
            {
              name: '⏰ ¿Qué Sigue?',
              value: `**${targetUser.username} puede:**`,
              inline: true
            },
            {
              name: '🎯 Opciones',
              value: '```✅ Aceptar la solicitud\n❌ Rechazar la solicitud\n👀 Ver en /friends```',
              inline: true
            },
            {
              name: '🎮 Beneficios de la Amistad',
              value: '```🏆 Competir en rankings\n💰 Compartir logros\n🎲 Jugar juntos\n📊 Ver estadísticas```',
              inline: false
            }
          ])
          .setFooter({ 
            text: 'Casino Bot • ¡Pronto podrían ser amigos!',
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });

    // ═══════════════════════════════════════════════════════════════
    // 📢 NOTIFICACIÓN PÚBLICA CON BOTONES EXCLUSIVOS
    // ═══════════════════════════════════════════════════════════════

    // Crear botones para aceptar/rechazar (solo para el destinatario)
    const acceptButton = new ButtonBuilder()
      .setCustomId(`accept_friend_${senderId}_${receiverId}`)
      .setLabel('Aceptar Amistad')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_friend_${senderId}_${receiverId}`)
      .setLabel('Rechazar Solicitud')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const buttonRow = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

    // Enviar mensaje público en el canal con botones exclusivos para el destinatario
    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle('🤝 Nueva Solicitud de Amistad!')
          .setColor(0x3498db)
          .setDescription(`**${interaction.user.username} quiere ser amigo de ${targetUser.username}!**\n\n🎯 *${targetUser.username}, ¿aceptas esta amistad?*`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setImage('https://i.imgur.com/hMwxvcd.png')
          .addFields([
            {
              name: '👥 Detalles de la Solicitud',
              value: `**De:** ${interaction.user.username}\n**Para:** ${targetUser.username}\n**Fecha:** ${new Date().toLocaleString('es-ES')}`,
              inline: true
            },
            {
              name: '🎮 Beneficios de la Amistad',
              value: '```🏆 Competir en rankings juntos\n💰 Compartir logros especiales\n🎲 Jugar en equipo\n📊 Ver estadísticas mutuas```',
              inline: true
            },
            {
              name: '⚡ Solo para ' + targetUser.username,
              value: '```✅ Usa el botón verde para aceptar\n❌ Usa el botón rojo para rechazar\n🚫 Otros usuarios no pueden interactuar```',
              inline: false
            }
          ])
          .setFooter({ 
            text: `Casino Bot • Solo ${targetUser.username} puede usar estos botones`,
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp()
      ],
      components: [buttonRow]
    });

    console.log(`📨 Notificación pública enviada - Solicitud de ${interaction.user.username} para ${targetUser.username}`);
}