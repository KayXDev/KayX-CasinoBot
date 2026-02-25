// ═══════════════════════════════════════════════════════════════
// 👥 FRIENDS MANAGEMENT COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { getUserFriends, getPendingRequests, getSentRequests, getFriendStats, acceptFriendRequest, rejectFriendRequest } from '../util/database/friendsDb.js';
import { addUserIfNotExists } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logGamblingCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('friends')
  .setDescription('Gestiona tu lista de amigos, solicitudes pendientes y más');

export async function execute(interaction) {
    const userId = interaction.user.id;
    await addUserIfNotExists(userId);

    // Obtener datos del usuario
    const stats = await getFriendStats(userId);
    const friends = await getUserFriends(userId);
    const pendingRequests = await getPendingRequests(userId);
    const sentRequests = await getSentRequests(userId);

    // ═══════════════════════════════════════════════════════════════
    // 📊 EMBED PRINCIPAL DEL SISTEMA DE AMIGOS
    // ═══════════════════════════════════════════════════════════════

    const mainEmbed = new EmbedBuilder()
      .setTitle('👥 Friends System')
      .setColor(0x1abc9c)
      .setDescription(`**Bienvenido a tu centro de amigos, ${interaction.user.username}!**\n\n🤝 *Gestiona tus conexiones sociales del casino*`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage('https://i.imgur.com/hMwxvcd.png')
      .addFields([
        {
          name: '📊 Estadísticas de Amigos',
          value: `\`\`\`👫 Amigos: ${stats.totalFriends}\n📥 Pendientes: ${stats.pendingReceived}\n📤 Enviadas: ${stats.pendingSent}\n🏆 Total Conexiones: ${stats.totalFriends + stats.pendingReceived + stats.pendingSent}\`\`\``,
          inline: false
        },
        {
          name: '🎯 Acciones Disponibles',
          value: '```👥 Ver lista de amigos\n📥 Gestionar solicitudes\n📤 Ver solicitudes enviadas\n➕ Enviar nueva solicitud```',
          inline: true
        },
        {
          name: '💡 ¿Sabías que?',
          value: '```🎮 Los amigos pueden competir\n🏆 Compartir logros especiales\n💰 Ver rankings privados\n🎲 Jugar en equipo```',
          inline: true
        }
      ])
      .setFooter({ 
        text: 'Casino Bot • Selecciona una opción del menú',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // ═══════════════════════════════════════════════════════════════
    // 🎮 MENÚ DE SELECCIÓN PRINCIPAL
    // ═══════════════════════════════════════════════════════════════

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('friends_menu')
      .setPlaceholder('🎯 Selecciona una opción...')
      .addOptions([
        {
          label: 'Ver Mis Amigos',
          description: `Lista de ${stats.totalFriends} amigos confirmados`,
          value: 'view_friends',
          emoji: '👫'
        },
        {
          label: 'Solicitudes Pendientes',
          description: `${stats.pendingReceived} solicitudes esperando respuesta`,
          value: 'pending_requests',
          emoji: '📥'
        },
        {
          label: 'Solicitudes Enviadas',
          description: `${stats.pendingSent} solicitudes que enviaste`,
          value: 'sent_requests',
          emoji: '📤'
        },
        {
          label: 'Actualizar Sistema',
          description: 'Refrescar información y estadísticas',
          value: 'refresh_system',
          emoji: '🔄'
        }
      ]);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);
    
    // Log gambling command
    await logGamblingCommand(interaction.user, 'friends', {
      action: 'executed'
    });

    await interaction.reply({
      embeds: [mainEmbed],
      components: [actionRow]
    });

    const response = await interaction.fetchReply();

    // ═══════════════════════════════════════════════════════════════
    // 🎛️ COLLECTOR PARA MANEJAR INTERACCIONES
    // ═══════════════════════════════════════════════════════════════

    const collector = response.createMessageComponentCollector({
      time: 300000 // 5 minutos
    });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.user.id !== interaction.user.id) {
        return componentInteraction.reply({
          content: '❌ Solo el usuario que ejecutó el comando puede usar este menú',
          flags: MessageFlags.Ephemeral
        });
      }

      // Manejar botón "Back to Menu"
      if (componentInteraction.customId === 'back_to_friends_menu') {
        // Regenerar el embed principal con datos actualizados
        const newStats = await getFriendStats(userId);
        
        const newMainEmbed = new EmbedBuilder()
          .setTitle('👥 Friends System')
          .setColor(0x1abc9c)
          .setDescription(`**¡Bienvenido, ${interaction.user.username}!**\n\n🤝 *Gestiona todas tus conexiones del casino*`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setImage('https://i.imgur.com/hMwxvcd.png')
          .addFields([
            {
              name: '👫 Tus Amigos',
              value: `\`\`\`👥 Total: ${newStats.totalFriends}\n🆕 Nuevos: ${newStats.recentFriends}\n🎯 Activos: ${newStats.activeFriends}\`\`\``,
              inline: true
            },
            {
              name: '📥 Solicitudes Pendientes',
              value: `\`\`\`📨 Recibidas: ${newStats.pendingRequests}\n📤 Enviadas: ${newStats.sentRequests}\n⏰ Total: ${newStats.totalPendingActivities}\`\`\``,
              inline: true
            }
          ])
          .setFooter({ 
            text: 'Casino Bot • Selecciona una opción del menú', 
            iconURL: interaction.client.user.displayAvatarURL() 
          })
          .setTimestamp();

        return componentInteraction.update({
          embeds: [newMainEmbed],
          components: [actionRow]
        });
      }

        // Manejar select menu
        if (componentInteraction.isStringSelectMenu()) {
          const selectedValue = componentInteraction.values[0];
          
          try {
            switch (selectedValue) {
              case 'view_friends':
                await handleViewFriends(componentInteraction);
                break;
              case 'pending_requests':
                await handlePendingRequests(componentInteraction);
                break;
              case 'sent_requests':
                await handleSentRequests(componentInteraction);
                break;
              case 'refresh_system':
                await handleRefreshSystem(componentInteraction);
                break;
            }
          } catch (error) {
            console.error('Error handling friends menu interaction:', error);
            await componentInteraction.reply({
              content: '❌ Error al procesar la acción. Intenta nuevamente.',
              flags: MessageFlags.Ephemeral
            });
          }
        }
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          selectMenu.setDisabled(true).setPlaceholder('⏰ Menú expirado - Usa /friends nuevamente')
        );
        await response.edit({ components: [disabledRow] });
      } catch (error) {
        console.error('Error disabling menu:', error);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // 🛠️ FUNCIONES AUXILIARES PARA CADA OPCIÓN
    // ═══════════════════════════════════════════════════════════════

    async function handleViewFriends(selectInteraction) {
      const userFriends = await getUserFriends(userId);
      
      if (userFriends.length === 0) {
        const noFriendsEmbed = new EmbedBuilder()
          .setTitle('👥 Lista de Amigos | Vacía')
          .setColor(0x95a5a6)
          .setDescription('**Aún no tienes amigos en el casino**\n\n💡 *¡Es hora de hacer nuevas conexiones!*')
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields([
            {
              name: '🚀 Comienza a Hacer Amigos',
              value: '```➕ Usa /addfriend @usuario\n🎯 Explora el servidor\n💬 Participa en juegos\n🤝 Sé amigable con otros```',
              inline: false
            }
          ])
          .setFooter({ text: 'Casino Bot • ¡Pronto tendrás muchos amigos!' });

        // Botón para volver al menú principal
        const backButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('back_to_friends_menu')
              .setLabel('🔙 Volver al Menú')
              .setStyle(ButtonStyle.Secondary)
          );

        return selectInteraction.update({ 
          embeds: [noFriendsEmbed], 
          components: [backButton]
        });
      }

      // Mostrar lista de amigos con nombres reales
      const friendsListPromises = userFriends.slice(0, 10).map(async (friend, index) => {
        try {
          let friendName = `Usuario ${friend.friend_id}`;
          
          // Intentar obtener el usuario del guild
          if (interaction.guild) {
            try {
              const guildMember = await interaction.guild.members.fetch(friend.friend_id);
              friendName = guildMember.displayName;
            } catch {
              // Si no está en el guild, intentar obtener el usuario global
              try {
                const user = await interaction.client.users.fetch(friend.friend_id);
                friendName = user.username;
              } catch {
                friendName = `Usuario ${friend.friend_id}`;
              }
            }
          }
          
          const friendDate = new Date(friend.accepted_at).toLocaleDateString('es-ES');
          return `**${index + 1}.** ${friendName}\n   └ *Amigos desde: ${friendDate}*`;
        } catch (error) {
          console.error('Error fetching friend name:', error);
          const friendDate = new Date(friend.accepted_at).toLocaleDateString('es-ES');
          return `**${index + 1}.** Usuario ${friend.friend_id}\n   └ *Amigos desde: ${friendDate}*`;
        }
      });

      const friendsList = (await Promise.all(friendsListPromises)).join('\n\n');

      const friendsEmbed = new EmbedBuilder()
        .setTitle(`👫 Lista de Amigos | ${userFriends.length} Total`)
        .setColor(0x1abc9c)
        .setDescription(`**Tus amigos del casino:**\n\n${friendsList}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields([
          {
            name: '🎮 Actividades con Amigos',
            value: '```🏆 Competir en rankings\n💰 Compartir logros\n🎲 Jugar en grupos\n📊 Comparar estadísticas```',
            inline: false
          }
        ])
        .setFooter({ text: `Casino Bot • Mostrando ${Math.min(userFriends.length, 10)} de ${userFriends.length} amigos` })
        .setTimestamp();

      // Botón para volver al menú principal
      const backButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('back_to_friends_menu')
            .setLabel('🔙 Volver al Menú')
            .setStyle(ButtonStyle.Secondary)
        );

      return selectInteraction.update({ 
        embeds: [friendsEmbed], 
        components: [backButton]
      });
    }

    async function handlePendingRequests(selectInteraction) {
      const pendingRequests = await getPendingRequests(userId);
      
      if (pendingRequests.length === 0) {
        const noPendingEmbed = new EmbedBuilder()
          .setTitle('📥 Solicitudes Pendientes | Vacío')
          .setColor(0x95a5a6)
          .setDescription('**No tienes solicitudes pendientes**\n\n✨ *Tu bandeja está limpia*')
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields([
            {
              name: '💡 ¿Qué puedes hacer?',
              value: '```➕ Envía solicitudes a otros\n🎯 Participa más en el casino\n💬 Interactúa con jugadores\n🎮 Sé activo en los juegos```',
              inline: false
            }
          ])
          .setFooter({ text: 'Casino Bot • ¡Cuando recibas solicitudes aparecerán aquí!' });

        // Botón para volver al menú principal
        const backButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('back_to_friends_menu')
              .setLabel('🔙 Volver al Menú')
              .setStyle(ButtonStyle.Secondary)
          );

        return selectInteraction.update({ 
          embeds: [noPendingEmbed], 
          components: [backButton]
        });
      }

      // Crear menú para gestionar solicitudes con nombres reales
      const requestOptionsPromises = pendingRequests.slice(0, 5).map(async (request, index) => {
        try {
          let requesterName = `Usuario ${request.requester_id}`;
          
          // Intentar obtener el usuario del guild
          if (interaction.guild) {
            try {
              const guildMember = await interaction.guild.members.fetch(request.requester_id);
              requesterName = guildMember.displayName;
            } catch {
              // Si no está en el guild, intentar obtener el usuario global
              try {
                const user = await interaction.client.users.fetch(request.requester_id);
                requesterName = user.username;
              } catch {
                requesterName = `Usuario ${request.requester_id}`;
              }
            }
          }
          
          return {
            label: `${requesterName}`,
            description: `Enviada: ${new Date(request.created_at).toLocaleDateString('es-ES')}`,
            value: `manage_${request.requester_id}`,
            emoji: '🤝'
          };
        } catch (error) {
          console.error('Error fetching requester name:', error);
          return {
            label: `Usuario ${request.requester_id}`,
            description: `Enviada: ${new Date(request.created_at).toLocaleDateString('es-ES')}`,
            value: `manage_${request.requester_id}`,
            emoji: '🤝'
          };
        }
      });

      const requestOptions = await Promise.all(requestOptionsPromises);

      const requestSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('manage_requests')
        .setPlaceholder('👥 Selecciona una solicitud para gestionar...')
        .addOptions(requestOptions);

      const requestRow = new ActionRowBuilder().addComponents(requestSelectMenu);
      
      const backButtonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('back_to_friends_menu')
            .setLabel('🔙 Volver al Menú')
            .setStyle(ButtonStyle.Secondary)
        );

      const pendingEmbed = new EmbedBuilder()
        .setTitle(`📥 Solicitudes Pendientes | ${pendingRequests.length} Total`)
        .setColor(0xf39c12)
        .setDescription('**Usuarios que quieren ser tus amigos:**\n\n🎯 *Selecciona una solicitud para aceptar o rechazar*')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields([
          {
            name: '⚡ Acciones Disponibles',
            value: '```✅ Aceptar solicitud\n❌ Rechazar solicitud\n👀 Ver perfil del usuario```',
            inline: false
          }
        ])
        .setFooter({ text: 'Casino Bot • Gestiona tus solicitudes pendientes' });

      await selectInteraction.reply({
        embeds: [pendingEmbed], 
        components: [requestRow, backButtonRow],
        flags: MessageFlags.Ephemeral
      });

      const requestResponse = await selectInteraction.fetchReply();      // Collector para gestionar solicitudes específicas
      const requestCollector = requestResponse.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 180000 // 3 minutos
      });

      requestCollector.on('collect', async (requestSelectInteraction) => {
        if (requestSelectInteraction.user.id !== interaction.user.id) return;

        const requesterId = requestSelectInteraction.values[0].replace('manage_', '');
        
        // Crear botones para aceptar/rechazar
        const acceptButton = new ButtonBuilder()
          .setCustomId(`accept_${requesterId}`)
          .setLabel('Aceptar')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅');

        const rejectButton = new ButtonBuilder()
          .setCustomId(`reject_${requesterId}`)
          .setLabel('Rechazar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const buttonRow = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

        let requesterName = `Usuario ${requesterId}`;
        
        // Intentar obtener el usuario del guild
        if (interaction.guild) {
          try {
            const guildMember = await interaction.guild.members.fetch(requesterId);
            requesterName = guildMember.displayName;
          } catch {
            // Si no está en el guild, intentar obtener el usuario global
            try {
              const user = await interaction.client.users.fetch(requesterId);
              requesterName = user.username;
            } catch {
              requesterName = `Usuario ${requesterId}`;
            }
          }
        }

        const confirmEmbed = new EmbedBuilder()
          .setTitle('🤝 Gestionar Solicitud de Amistad')
          .setColor(0xf39c12)
          .setDescription(`**Solicitud de: ${requesterName}**\n\n🎯 *¿Qué quieres hacer?*`)
          .setThumbnail(requesterUser ? requesterUser.displayAvatarURL() : interaction.user.displayAvatarURL())
          .setFooter({ text: 'Casino Bot • Selecciona una acción' });

        const buttonResponse = await requestSelectInteraction.update({ 
          embeds: [confirmEmbed], 
          components: [buttonRow]
        });

        // Collector para botones
        const buttonCollector = buttonResponse.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 120000 // 2 minutos
        });

        buttonCollector.on('collect', async (buttonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) return;

          const action = buttonInteraction.customId.split('_')[0];
          const targetId = buttonInteraction.customId.split('_')[1];

          if (action === 'accept') {
            const result = await acceptFriendRequest(userId, targetId);
            const embed = new EmbedBuilder()
              .setTitle(result.success ? '✅ Solicitud Aceptada!' : '❌ Error')
              .setColor(result.success ? 0x1abc9c : 0xe74c3c)
              .setDescription(result.success 
                ? `**¡Ahora eres amigo de ${requesterName}!**\n\n🎉 *¡Bienvenido a tu nueva amistad!*`
                : `**Error:** ${result.message}`)
              .setFooter({ text: 'Casino Bot' });

            await buttonInteraction.update({ embeds: [embed], components: [] });

            // ═══════════════════════════════════════════════════════════════
            // 📢 NOTIFICACIÓN PÚBLICA DE AMISTAD ACEPTADA
            // ═══════════════════════════════════════════════════════════════
            if (result.success && config.friends?.notifications?.enablePublicAcceptance !== false) {
              const requesterUser = interaction.guild?.members.cache.get(targetId);
              const accepterUser = interaction.guild?.members.cache.get(userId);
              
              // Mensaje público celebrando la nueva amistad
              await buttonInteraction.followUp({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('🎉 ¡Nueva Amistad Confirmada!')
                    .setColor(0x1abc9c)
                    .setDescription(`**${requesterUser ? requesterUser.displayName : 'Un usuario'} y ${accepterUser ? accepterUser.displayName : 'otro usuario'} ahora son amigos!**\n\n💫 *¡La comunidad del casino se fortalece!*`)
                    .setThumbnail('https://i.imgur.com/friendship-celebration.png')
                    .addFields([
                      {
                        name: '🤝 Nueva Conexión',
                        value: `**${requesterUser ? requesterUser.displayName : 'Usuario'}** ➜ **${accepterUser ? accepterUser.displayName : 'Usuario'}**\n*¡Solicitud aceptada exitosamente!*`,
                        inline: false
                      },
                      {
                        name: '🎮 ¡Ahora pueden!',
                        value: '```🏆 Competir juntos en rankings\n🎲 Jugar en equipo\n💰 Compartir logros\n📊 Ver estadísticas mutuas```',
                        inline: true
                      },
                      {
                        name: '🌟 Celebración',
                        value: '```🎊 ¡Felicidades por la amistad!\n💪 ¡Más fuerte juntos!\n🎯 ¡A conquistar el casino!```',
                        inline: true
                      }
                    ])
                    .setFooter({ 
                      text: 'Casino Bot • ¡Construyendo amistades!',
                      iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp()
                ]
              });
            }
          } else {
            const result = await rejectFriendRequest(userId, targetId);
            const embed = new EmbedBuilder()
              .setTitle(result.success ? '❌ Solicitud Rechazada' : '❌ Error')
              .setColor(0x95a5a6)
              .setDescription(result.success 
                ? `**Solicitud de ${requesterName} rechazada**\n\n💭 *Decisión respetada*`
                : `**Error:** ${result.message}`)
              .setFooter({ text: 'Casino Bot' });

            await buttonInteraction.update({ embeds: [embed], components: [] });
          }
        });
      });
    }

    async function handleSentRequests(selectInteraction) {
      const sentRequests = await getSentRequests(userId);
      
      if (sentRequests.length === 0) {
        const noSentEmbed = new EmbedBuilder()
          .setTitle('📤 Solicitudes Enviadas | Vacío')
          .setColor(0x95a5a6)
          .setDescription('**No has enviado solicitudes pendientes**\n\n💡 *¡Encuentra nuevos amigos!*')
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields([
            {
              name: '🚀 Comienza a Conectar',
              value: '```➕ Usa /addfriend @usuario\n🎯 Busca jugadores activos\n💬 Interactúa en el casino\n🤝 Sé sociable```',
              inline: false
            }
          ])
          .setFooter({ text: 'Casino Bot • ¡Envía tu primera solicitud!' });

        // Botón para volver al menú principal
        const backButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('back_to_friends_menu')
              .setLabel('🔙 Volver al Menú')
              .setStyle(ButtonStyle.Secondary)
          );

        return selectInteraction.update({ 
          embeds: [noSentEmbed], 
          components: [backButton]
        });
      }

      const sentListPromises = sentRequests.slice(0, 10).map(async (request, index) => {
        try {
          let targetName = `Usuario ${request.friend_id}`;
          
          // Intentar obtener el usuario del guild
          if (interaction.guild) {
            try {
              const guildMember = await interaction.guild.members.fetch(request.friend_id);
              targetName = guildMember.displayName;
            } catch {
              // Si no está en el guild, intentar obtener el usuario global
              try {
                const user = await interaction.client.users.fetch(request.friend_id);
                targetName = user.username;
              } catch {
                targetName = `Usuario ${request.friend_id}`;
              }
            }
          }
          
          const sentDate = new Date(request.created_at).toLocaleDateString('es-ES');
          return `**${index + 1}.** ${targetName}\n   └ *Enviada: ${sentDate}*`;
        } catch (error) {
          console.error('Error fetching target name:', error);
          const sentDate = new Date(request.created_at).toLocaleDateString('es-ES');
          return `**${index + 1}.** Usuario ${request.friend_id}\n   └ *Enviada: ${sentDate}*`;
        }
      });

      const sentList = (await Promise.all(sentListPromises)).join('\n\n');

      const sentEmbed = new EmbedBuilder()
        .setTitle(`📤 Solicitudes Enviadas | ${sentRequests.length} Total`)
        .setColor(0x3498db)
        .setDescription(`**Esperando respuesta de:**\n\n${sentList}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields([
          {
            name: '⏰ Estado',
            value: '```⌛ Pendientes de respuesta\n💭 Sé paciente\n🤝 Pronto podrían aceptar\n✨ O envía más solicitudes```',
            inline: false
          }
        ])
        .setFooter({ text: `Casino Bot • Mostrando ${Math.min(sentRequests.length, 10)} de ${sentRequests.length} solicitudes` });

      // Botón para volver al menú principal
      const backButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('back_to_friends_menu')
            .setLabel('🔙 Volver al Menú')
            .setStyle(ButtonStyle.Secondary)
        );

      return selectInteraction.update({ 
        embeds: [sentEmbed], 
        components: [backButton]
      });
    }

    async function handleRefreshSystem(selectInteraction) {
      // Recargar datos actualizados
      const newStats = await getFriendStats(userId);
      
      const refreshEmbed = new EmbedBuilder()
        .setTitle('👥 Friends System')
        .setColor(0x1abc9c)
        .setDescription(`**Sistema actualizado, ${interaction.user.username}!**\n\n🔄 *Información refrescada*`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage('https://i.imgur.com/hMwxvcd.png')
        .addFields([
          {
            name: '📊 Estadísticas Actualizadas',
            value: `\`\`\`👫 Amigos: ${newStats.totalFriends}\n📥 Pendientes: ${newStats.pendingReceived}\n📤 Enviadas: ${newStats.pendingSent}\n🏆 Total Conexiones: ${newStats.totalFriends + newStats.pendingReceived + newStats.pendingSent}\`\`\``,
            inline: false
          },
          {
            name: '🎯 Acciones Disponibles',
            value: '```👥 Ver lista de amigos\n📥 Gestionar solicitudes\n📤 Ver solicitudes enviadas\n➕ Enviar nueva solicitud```',
            inline: true
          },
          {
            name: '🔄 Actualizado',
            value: `\`\`\`📅 ${new Date().toLocaleString('es-ES')}\n✅ Datos sincronizados\n🚀 Información actual\`\`\``,
            inline: true
          }
        ])
        .setFooter({ 
          text: 'Casino Bot • Sistema actualizado exitosamente',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // Actualizar el menú con nuevas estadísticas
      const newSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('friends_menu')
        .setPlaceholder('🎯 Selecciona una opción...')
        .addOptions([
          {
            label: 'Ver Mis Amigos',
            description: `Lista de ${newStats.totalFriends} amigos confirmados`,
            value: 'view_friends',
            emoji: '👫'
          },
          {
            label: 'Solicitudes Pendientes',
            description: `${newStats.pendingReceived} solicitudes esperando respuesta`,
            value: 'pending_requests',
            emoji: '📥'
          },
          {
            label: 'Solicitudes Enviadas',
            description: `${newStats.pendingSent} solicitudes que enviaste`,
            value: 'sent_requests',
            emoji: '📤'
          },
          {
            label: 'Actualizar Sistema',
            description: 'Refrescar información y estadísticas',
            value: 'refresh_system',
            emoji: '🔄'
          }
        ]);

      const newActionRow = new ActionRowBuilder().addComponents(newSelectMenu);

      await selectInteraction.update({
        embeds: [refreshEmbed],
        components: [newActionRow]
      });
    }
}