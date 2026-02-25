// ═══════════════════════════════════════════════════════════════
// 🛠️ COMANDO MODO MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════

import {  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits , MessageFlags } from 'discord.js';
import maintenanceSystem from '../util/maintenanceSystem.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('maintenance')
  .setDescription('🛠️ Gestionar modo mantenimiento del bot')
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Acción a realizar')
      .setRequired(true)
      .addChoices(
        { name: '🔧 Activar Mantenimiento', value: 'enable' },
        { name: '✅ Desactivar Mantenimiento', value: 'disable' },
        { name: '📊 Ver Estado', value: 'status' },
        { name: '� Configurar Canal', value: 'set-channel' },
        { name: '�👥 Agregar Admin', value: 'add-admin' },
        { name: '👤 Remover Admin', value: 'remove-admin' },
        { name: '📋 Listar Admins', value: 'list-admin' }
      ))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Razón del mantenimiento (solo para activar)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('duration')
      .setDescription('Duración en minutos (solo para activar)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(1440))
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Usuario para agregar/remover como admin')
      .setRequired(false))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Canal para notificaciones de mantenimiento')
      .setRequired(false));

export async function execute(interaction, config) {
  try {
    const action = interaction.options.getString('action');
    
    // Permitir que todos vean el estado, pero solo el owner puede hacer otras acciones
    if (action === 'status') {
      await handleStatus(interaction);
      return;
    }
    
    // Verificar que solo el owner puede usar este comando
    const ownerID = config.ownerID;
    if (interaction.user.id !== ownerID) {
      const noPermEmbed = new EmbedBuilder()
        .setTitle('❌ Access Denied')
        .setColor(0xff0000)
        .setDescription('**You do not have permission to use this command**\n\n� *This command is restricted to the bot owner only*')
        .setFooter({ text: 'Casino Bot • Owner Only Command' })
        .setTimestamp();

      return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
    }

    // Log gambling command
    await logGamblingCommand(interaction.user, 'maintenance', {
      action: 'executed'
    });

    switch (action) {
      case 'enable':
        await handleEnable(interaction);
        break;
      case 'disable':
        await handleDisable(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
      case 'set-channel':
        await handleSetChannel(interaction);
        break;
      case 'add-admin':
      case 'remove-admin':
      case 'list-admin':
        await handleAdmin(interaction, action);
        break;
      default:
        await interaction.reply({ 
          content: '❌ Acción no reconocida.', 
          flags: MessageFlags.Ephemeral 
        });
    }
  } catch (error) {
    console.error('Error in maintenance command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en Comando de Mantenimiento')
      .setDescription(`Ha ocurrido un error: ${error.message}`)
      .setColor('#FF0000')
      .setTimestamp();
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 ACTIVAR MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════

async function handleEnable(interaction) {
  const reason = interaction.options.getString('reason') || 'Mantenimiento programado';
  const duration = interaction.options.getInteger('duration') || null;
  
  // Verificar si ya está en mantenimiento
  if (await maintenanceSystem.isMaintenanceMode()) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Ya en Mantenimiento')
      .setDescription('El bot ya está en modo mantenimiento.')
      .setColor('#FFA500')
      .setTimestamp();
    
    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Activar mantenimiento
  const success = await maintenanceSystem.enableMaintenance(reason, duration, interaction.user.id);
  
  if (success) {
    // Agregar al usuario como admin si no lo es
    await maintenanceSystem.addAdmin(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🚧 Mantenimiento Activado')
      .setColor('#FFA500')
      .addFields(
        { name: '🔧 Razón', value: reason, inline: true },
        { name: '⏰ Duración', value: duration ? `${duration} minutos` : 'No especificada', inline: true },
        { name: '👨‍💻 Activado por', value: interaction.user.toString(), inline: true }
      )
      .setDescription(
        '✅ **Modo mantenimiento activado exitosamente.**\n\n' +
        '⚠️ Solo administradores pueden usar comandos durante el mantenimiento.\n' +
        '📞 Comandos disponibles: `help`, `maintenance`'
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    
    // Log en consola
    console.log(`🚧 Maintenance mode enabled by ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`📋 Reason: ${reason}`);
    if (duration) {
      console.log(`⏰ Duration: ${duration} minutes`);
    }
  } else {
    const embed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('No se pudo activar el modo mantenimiento. Revisa la consola para más detalles.')
      .setColor('#FF0000')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ DESACTIVAR MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════

async function handleDisable(interaction) {
  // Verificar si está en mantenimiento
  if (!await maintenanceSystem.isMaintenanceMode()) {
    const embed = new EmbedBuilder()
      .setTitle('ℹ️ No en Mantenimiento')
      .setDescription('El bot no está actualmente en modo mantenimiento.')
      .setColor('#0099FF')
      .setTimestamp();
    
    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Obtener estadísticas antes de desactivar
  const stats = maintenanceSystem.getMaintenanceStats();
  
  // Desactivar mantenimiento
  const success = await maintenanceSystem.disableMaintenance();
  
  if (success) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Mantenimiento Desactivado')
      .setColor('#00FF00')
      .setDescription(
        '🎉 **El bot ha vuelto a funcionamiento normal.**\n\n' +
        'Todos los comandos están ahora disponibles para todos los usuarios.'
      )
      .addFields(
        { name: '🔧 Razón anterior', value: stats.reason || 'No especificada', inline: true },
        { name: '⏰ Duración total', value: `${stats.duration} minutos`, inline: true },
        { name: '👨‍💻 Desactivado por', value: interaction.user.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    
    // Log en consola
    console.log(`✅ Maintenance mode disabled by ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`📊 Total duration: ${stats.duration} minutes`);
  } else {
    const embed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('No se pudo desactivar el modo mantenimiento. Revisa la consola para más detalles.')
      .setColor('#FF0000')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 ESTADO DEL MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════

async function handleStatus(interaction) {
  try {
    // Defer the reply to give us more time
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    // Refresh maintenance status from database first
    await maintenanceSystem.refreshFromDatabase();
    
    const embed = maintenanceSystem.getStatusEmbed();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleStatus:', error);
    try {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Hubo un error al obtener el estado del mantenimiento.')
        .setColor('#FF0000')
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 👥 GESTIÓN DE ADMINISTRADORES
// ═══════════════════════════════════════════════════════════════

async function handleAdmin(interaction, action) {
  const user = interaction.options.getUser('user');

  switch (action) {
    case 'add-admin':
      if (!user) {
        return await interaction.reply({ 
          content: '❌ Debes especificar un usuario para agregar.', 
          flags: MessageFlags.Ephemeral 
        });
      }
      
      const addSuccess = await maintenanceSystem.addAdmin(user.id);
      const addEmbed = new EmbedBuilder()
        .setTitle(addSuccess ? '✅ Administrador Agregado' : 'ℹ️ Ya es Administrador')
        .setDescription(addSuccess 
          ? `${user.toString()} ha sido agregado como administrador del sistema de mantenimiento.`
          : `${user.toString()} ya es administrador del sistema.`)
        .setColor(addSuccess ? '#00FF00' : '#FFA500')
        .setTimestamp();
      
      await interaction.reply({ embeds: [addEmbed] });
      break;

    case 'remove-admin':
      if (!user) {
        return await interaction.reply({ 
          content: '❌ Debes especificar un usuario para remover.', 
          flags: MessageFlags.Ephemeral 
        });
      }
      
      const removeSuccess = await maintenanceSystem.removeAdmin(user.id);
      const removeEmbed = new EmbedBuilder()
        .setTitle(removeSuccess ? '✅ Administrador Removido' : 'ℹ️ No es Administrador')
        .setDescription(removeSuccess 
          ? `${user.toString()} ha sido removido como administrador del sistema de mantenimiento.`
          : `${user.toString()} no es administrador del sistema.`)
        .setColor(removeSuccess ? '#00FF00' : '#FFA500')
        .setTimestamp();
      
      await interaction.reply({ embeds: [removeEmbed] });
      break;

    case 'list-admin':
      const config = maintenanceSystem.config;
      const listEmbed = new EmbedBuilder()
        .setTitle('👥 Lista de Administradores')
        .setDescription(
          config.adminUsers.length > 0
            ? config.adminUsers.map(id => `<@${id}>`).join('\n')
            : 'No hay administradores configurados.'
        )
        .setColor('#0099FF')
        .setFooter({ text: `Total: ${config.adminUsers.length} administradores` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [listEmbed] });
      break;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📢 CONFIGURACIÓN DE CANAL DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════

async function handleSetChannel(interaction) {
  const channel = interaction.options.getChannel('channel');
  
  if (!channel) {
    const currentChannel = maintenanceSystem.config.notificationChannel;
    
    const embed = new EmbedBuilder()
      .setTitle('📢 Configuración de Canal de Notificaciones')
      .setColor('#4169E1')
      .setDescription('Configura el canal donde se enviarán las notificaciones de mantenimiento automático.')
      .addFields(
        { 
          name: '📍 Canal Actual', 
          value: currentChannel 
            ? `<#${currentChannel}>` 
            : 'No configurado (se usa búsqueda automática)',
          inline: true 
        },
        {
          name: '💡 Instrucciones',
          value: '• Usa `/maintenance action:📢 Configurar Canal channel:#tu-canal` para configurar\n' +
                 '• También puedes editar `notificationChannel` en config.yml\n' +
                 '• Si no se configura, se buscará automáticamente un canal apropiado',
          inline: false
        }
      )
      .setFooter({ text: '💡 Necesitas permisos de administrador para cambiar esta configuración' })
      .setTimestamp();
    
    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
  
  // Verificar que es un canal de texto
  if (!channel.isTextBased()) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error de Canal')
      .setDescription('El canal seleccionado debe ser un canal de texto.')
      .setColor('#FF0000')
      .setTimestamp();
    
    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
  
  // Verificar permisos del bot en el canal
  try {
    const permissions = channel.permissionsFor(interaction.client.user);
    if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
      const permErrorEmbed = new EmbedBuilder()
        .setTitle('❌ Permisos Insuficientes')
        .setDescription(`El bot no tiene permisos suficientes en ${channel}.\n\nPermisos requeridos:\n• Ver Canal\n• Enviar Mensajes\n• Insertar Enlaces`)
        .setColor('#FF0000')
        .setTimestamp();
      
      return await interaction.reply({ embeds: [permErrorEmbed], flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
  }
  
  // Actualizar configuración
  maintenanceSystem.config.notificationChannel = channel.id;
  const success = await maintenanceSystem.saveConfig();
  
  if (success) {
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Canal Configurado')
      .setColor('#00FF00')
      .setDescription(`Canal de notificaciones de mantenimiento actualizado correctamente.`)
      .addFields(
        { name: '📢 Nuevo Canal', value: channel.toString(), inline: true },
        { name: '🔧 Configurado por', value: interaction.user.toString(), inline: true },
        { 
          name: '💡 Información', 
          value: 'Las notificaciones automáticas de finalización de mantenimiento se enviarán a este canal.',
          inline: false 
        }
      )
      .setFooter({ text: '🛠️ Sistema de Mantenimiento' })
      .setTimestamp();
    
    // Enviar mensaje de prueba al canal configurado
    try {
      const testEmbed = new EmbedBuilder()
        .setTitle('🎉 Canal de Notificaciones Configurado')
        .setDescription('Este canal ha sido configurado para recibir notificaciones automáticas del sistema de mantenimiento.')
        .setColor('#00FF00')
        .addFields(
          { name: '👤 Configurado por', value: interaction.user.toString(), inline: true },
          { name: '⚙️ Tipo de Notificaciones', value: 'Finalización automática de mantenimiento', inline: true }
        )
        .setFooter({ text: '🛠️ Sistema de Mantenimiento - Mensaje de Prueba' })
        .setTimestamp();
      
      await channel.send({ embeds: [testEmbed] });
      
      successEmbed.addFields({
        name: '✅ Prueba Exitosa',
        value: `Mensaje de prueba enviado correctamente a ${channel}`,
        inline: false
      });
      
    } catch (testError) {
      console.error('Error sending test message:', testError);
      successEmbed.addFields({
        name: '⚠️ Advertencia',
        value: 'El canal fue configurado pero hubo un error enviando el mensaje de prueba. Verifica los permisos del bot.',
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [successEmbed] });
    console.log(`📢 Canal de notificaciones configurado: #${channel.name} (${channel.id}) por ${interaction.user.tag}`);
    
  } else {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error al Guardar')
      .setDescription('Hubo un error al guardar la configuración. Inténtalo de nuevo.')
      .setColor('#FF0000')
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}