// ═══════════════════════════════════════════════════════════════
// 👑 ADMIN GIVE ALL COMMAND
// ═══════════════════════════════════════════════════════════════

import {  SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder , MessageFlags } from 'discord.js';
import { getAllUsers, updateUserBalance, addUserIfNotExists } from '../db.js';
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
  .setName('admin-giveall')
  .setDescription('👑 Admin: Dar dinero a TODOS los usuarios del casino')
  .setDefaultMemberPermissions('0') // Solo administradores con permisos especiales
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Cantidad a dar a cada usuario')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(999999999) // Límite máximo de seguridad
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Razón del regalo (opcional)')
      .setRequired(false)
      .setMaxLength(200) // Límite de caracteres para la razón
  );

export async function execute(interaction) {
  // ═══════════════════════════════════════════════════════════════
  // 🔒 VERIFICACIÓN MÚLTIPLE DE PERMISOS DE ADMINISTRADOR
  // ═══════════════════════════════════════════════════════════════
  
  // 1. Verificar que exista configuración de adminRoles
  if (!config.adminRoles || config.adminRoles.length === 0) {
    const noConfigEmbed = new EmbedBuilder()
      .setTitle('⚙️ Configuración Faltante')
      .setColor(0xffa500)
      .setDescription('**No hay roles de administrador configurados**\n\n🔧 *Configura adminRoles en config.yml*')
      .setFooter({ text: 'Casino Bot • Error de Configuración' });

    return interaction.reply({ embeds: [noConfigEmbed], flags: MessageFlags.Ephemeral });
  }

  // 2. Verificar que el usuario tenga al menos uno de los roles de admin
  const hasAdminRole = config.adminRoles.some(roleId => 
    interaction.member.roles.cache.has(roleId));

  // 3. Verificar que el usuario sea el owner del bot (seguridad extra)
  const isOwner = interaction.user.id === config.ownerID;

  // 4. Verificar permisos de administrador de Discord
  const hasAdminPerms = interaction.member.permissions.has('Administrator');

  // Si no cumple ninguno de los criterios, denegar acceso
  if (!hasAdminRole && !isOwner && !hasAdminPerms) {
    const noPermEmbed = new EmbedBuilder()
      .setTitle('🚫 Acceso Denegado')
      .setColor(0xff0000)
      .setDescription('**No tienes permisos para usar este comando**\n\n🔒 *Este comando está restringido a administradores únicamente*')
      .addFields([
        {
          name: '❌ Permisos Requeridos',
          value: '```👑 Rol de Administrador del Bot\n🛡️ Permisos de Administrador de Discord\n🔑 Ser el propietario del bot```',
          inline: false
        },
        {
          name: '💡 ¿Cómo Obtener Acceso?',
          value: '```📞 Contacta a un administrador\n⚙️ Revisa la configuración del bot\n🎯 Verifica tus roles en el servidor```',
          inline: false
        }
      ])
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Casino Bot • Comando Restringido' })
      .setTimestamp();

    return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
  }

  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'Regalo del administrador';

  try {
    // Obtener todos los usuarios de la base de datos
    const allUsers = await getAllUsers();
    
    if (allUsers.length === 0) {
      const noUsersEmbed = new EmbedBuilder()
        .setTitle('📊 No Hay Usuarios')
        .setColor(0xffa500)
        .setDescription('**No hay usuarios registrados en la base de datos**\n\n💡 *Los usuarios se registran automáticamente al usar comandos del casino*')
        .setFooter({ text: 'Casino Bot • Sistema de Administración' });

      return interaction.reply({ embeds: [noUsersEmbed], flags: MessageFlags.Ephemeral });
    }

    // Crear embed de confirmación
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmación Requerida')
      .setColor(0xffa500)
      .setDescription(`**¿Estás seguro de dar dinero a TODOS los usuarios?**\n\n💰 *Esta acción no se puede deshacer*`)
      .addFields([
        {
          name: '💵 Cantidad por Usuario',
          value: `\`\`\`💰 ${amount.toLocaleString()} monedas\n💳 Se agregará a la billetera\n🎁 Regalo para cada usuario\`\`\``,
          inline: true
        },
        {
          name: '📊 Impacto Total',
          value: `\`\`\`👥 ${allUsers.length} usuarios afectados\n💰 ${(amount * allUsers.length).toLocaleString()} total\n🏦 Impacto en la economía\`\`\``,
          inline: true
        },
        {
          name: '📝 Razón del Regalo',
          value: `\`\`\`📋 ${reason}\n🎯 Motivo del regalo\n📢 Será mostrado a usuarios\`\`\``,
          inline: false
        }
      ])
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Casino Bot • Confirma la acción usando los botones' })
      .setTimestamp();

    // Botones de confirmación
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_giveall')
      .setLabel('✅ Confirmar Regalo')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_giveall')
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [actionRow],
      flags: MessageFlags.Ephemeral
    });

    // Collector para los botones
    const collector = response.createMessageComponentCollector({
      time: 30000 // 30 segundos para confirmar
    });

    collector.on('collect', async (buttonInteraction) => {
      // Verificación doble de seguridad
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: '🚫 **ACCESO DENEGADO** - Solo el administrador que ejecutó el comando puede usar estos botones',
          flags: MessageFlags.Ephemeral
        });
      }
      
      // Verificación adicional: confirmar que sigue siendo administrador
      const stillHasAdminRole = config.adminRoles.some(roleId => 
        buttonInteraction.member.roles.cache.has(roleId));
      const stillIsOwner = buttonInteraction.user.id === config.ownerID;
      const stillHasAdminPerms = buttonInteraction.member.permissions.has('Administrator');
      
      if (!stillHasAdminRole && !stillIsOwner && !stillHasAdminPerms) {
        return buttonInteraction.reply({
          content: '🚫 **PERMISOS INSUFICIENTES** - Ya no tienes permisos de administrador',
          flags: MessageFlags.Ephemeral
        });
      }

      if (buttonInteraction.customId === 'confirm_giveall') {
        // Procesar el regalo para todos
        await processGiveAll(buttonInteraction, allUsers, amount, reason, interaction.user);
      } else if (buttonInteraction.customId === 'cancel_giveall') {
        // Cancelar la acción
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Acción Cancelada')
          .setColor(0x95a5a6)
          .setDescription('**El regalo masivo ha sido cancelado**\n\n💡 *No se realizó ningún cambio en las cuentas de usuario*')
          .setFooter({ text: 'Casino Bot • Acción Cancelada' });

        await buttonInteraction.update({
          embeds: [cancelEmbed],
          components: []
        });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        // Tiempo agotado
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Tiempo Agotado')
          .setColor(0x95a5a6)
          .setDescription('**La confirmación expiró**\n\n💡 *El regalo masivo fue cancelado por inactividad*')
          .setFooter({ text: 'Casino Bot • Tiempo Agotado' });

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: []
        });
      }
    });

  } catch (error) {
    console.error('Error in admin-giveall command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error del Sistema')
      .setColor(0xff0000)
      .setDescription('**Hubo un error al procesar el comando**\n\n🔧 *Por favor intenta nuevamente*')
      .setFooter({ text: 'Casino Bot • Error del Sistema' });

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ FUNCIÓN PARA PROCESAR EL REGALO MASIVO
// ═══════════════════════════════════════════════════════════════

async function processGiveAll(buttonInteraction, allUsers, amount, reason, adminUser) {
  try {
    // Mostrar embed de procesamiento
    const processingEmbed = new EmbedBuilder()
      .setTitle('⚙️ Procesando Regalo Masivo...')
      .setColor(0x3498db)
      .setDescription('**Distribuyendo dinero a todos los usuarios**\n\n⏳ *Por favor espera, esto puede tomar unos momentos*')
      .addFields([
        {
          name: '📊 Progreso',
          value: `\`\`\`⏳ Procesando ${allUsers.length} usuarios...\n💰 ${amount.toLocaleString()} por usuario\n🎁 Distribuyendo regalos...\`\`\``,
          inline: false
        }
      ])
      .setFooter({ text: 'Casino Bot • Procesando...' });

    await buttonInteraction.update({
      embeds: [processingEmbed],
      components: []
    });

    let successCount = 0;
    let errorCount = 0;

    // Procesar cada usuario
    for (const user of allUsers) {
      try {
        await updateUserBalance(user.user_id, amount);
        successCount++;
      } catch (error) {
        console.error(`Error giving money to user ${user.user_id}:`, error);
        errorCount++;
      }
    }

    // Log del comando administrativo
    await logAdminCommand('admin-giveall', adminUser, {
      amount: `${amount} monedas`,
      result: `Exitosos: ${successCount} | Errores: ${errorCount}`,
      additional: `Total distribuido: ${(successCount * amount).toLocaleString()} monedas`
    });

    // Crear embed de resultado
    const resultEmbed = new EmbedBuilder()
      .setTitle('🎉 Regalo Masivo Completado')
      .setColor(0x00ff00)
      .setDescription(`**¡El regalo ha sido distribuido exitosamente!**\n\n🎁 *Todos los usuarios han recibido sus monedas*`)
      .addFields([
        {
          name: '✅ Resultados de la Distribución',
          value: `\`\`\`✅ Exitosos: ${successCount} usuarios\n❌ Errores: ${errorCount} usuarios\n💰 Total distribuido: ${(successCount * amount).toLocaleString()} monedas\`\`\``,
          inline: true
        },
        {
          name: '📋 Detalles del Regalo',
          value: `\`\`\`💵 ${amount.toLocaleString()} por usuario\n👑 Por: ${adminUser.username}\n📝 ${reason}\`\`\``,
          inline: true
        }
      ])
      .setThumbnail(adminUser.displayAvatarURL())
      .setFooter({ text: 'Casino Bot • Regalo Completado' })
      .setTimestamp();

    if (errorCount > 0) {
      resultEmbed.addFields([
        {
          name: '⚠️ Errores Detectados',
          value: `\`\`\`⚠️ ${errorCount} usuario(s) no pudieron recibir el regalo\n🔧 Revisa los logs para más detalles\n💡 Los demás usuarios sí recibieron su dinero\`\`\``,
          inline: false
        }
      ]);
      resultEmbed.setColor(0xffa500);
    }

    await buttonInteraction.editReply({
      embeds: [resultEmbed],
      components: []
    });

    // Opcional: Enviar anuncio público si está configurado
    if (config.adminRoles && successCount > 0) {
      try {
        const announcementEmbed = new EmbedBuilder()
          .setTitle('🎁 ¡Regalo del Casino!')
          .setColor(0x00ff00)
          .setDescription(`**¡Todos los usuarios han recibido un regalo!**\n\n💰 *¡Revisa tu balance con /balance!*`)
          .addFields([
            {
              name: '🎉 Regalo Recibido',
              value: `\`\`\`💰 ${amount.toLocaleString()} monedas\n🎁 Agregadas a tu billetera\n👑 Cortesía de la administración\`\`\``,
              inline: true
            },
            {
              name: '📝 Motivo',
              value: `\`\`\`📋 ${reason}\n🎯 Regalo especial\n💎 ¡Disfrútalas!\`\`\``,
              inline: true
            }
          ])
          .setFooter({ text: 'Casino Bot • ¡Gracias por ser parte de nuestra comunidad!' })
          .setTimestamp();

        // Enviar en el canal actual (solo si no es efímero)
        if (buttonInteraction.channel && buttonInteraction.channel.permissionsFor(buttonInteraction.client.user).has('SendMessages')) {
          await buttonInteraction.followUp({
            embeds: [announcementEmbed]
          });
        }
      } catch (error) {
        console.error('Error sending public announcement:', error);
      }
    }

  } catch (error) {
    console.error('Error processing give all:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error al Procesar')
      .setColor(0xff0000)
      .setDescription('**Hubo un error durante la distribución**\n\n🔧 *Algunos usuarios pueden no haber recibido el regalo*')
      .setFooter({ text: 'Casino Bot • Error en Procesamiento' });

    await buttonInteraction.editReply({
      embeds: [errorEmbed],
      components: []
    });
  }
}