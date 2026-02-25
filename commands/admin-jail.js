import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { isUserJailed, jailedUsers, robbankCooldowns } from './robbank.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

// Función para limpiar entradas expiradas de la cárcel
function cleanExpiredJails() {
  const now = Date.now();
  for (const [userId, jailEnd] of jailedUsers) {
    if (now >= jailEnd) {
      jailedUsers.delete(userId);
      console.log(`🔓 Auto-release: Removed expired jail for user ${userId}`);
    }
  }
}

export const data = new SlashCommandBuilder()
  .setName('admin-jail')
  .setDescription('🔧 [ADMIN] Gestionar el sistema de cárcel del robbank')
  .setDefaultMemberPermissions('0')
  .addSubcommand(subcommand =>
    subcommand
      .setName('release')
      .setDescription('Liberar a un usuario de la cárcel')
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('Usuario a liberar de la cárcel')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Ver el estado de la cárcel de un usuario')
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('Usuario a verificar')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('Mostrar todos los usuarios actualmente en la cárcel'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('debug')
      .setDescription('Ver información de debug del sistema de cárcel'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('cooldown-status')
      .setDescription('Ver el cooldown del robbank de un usuario')
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('Usuario a verificar cooldown')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('cooldown-reset')
      .setDescription('Resetear el cooldown del robbank de un usuario')
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('Usuario a resetear cooldown')
          .setRequired(true)));

export async function execute(interaction, config) {
  // Limpiar entradas expiradas antes de cualquier operación
  cleanExpiredJails();
  
  // Verificar permisos de administrador
  if (!interaction.member?.permissions.has('Administrator') && 
      interaction.user.id !== config?.ownerID) {
    const noPermEmbed = new EmbedBuilder()
      .setTitle('🚫 Acceso Denegado')
      .setDescription('Este comando requiere permisos de **Administrador**.')
      .setColor(0xe74c3c);
    
    return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
  }

  const subcommand = interaction.options.getSubcommand();
  const moneda = config?.casino?.moneda || '💰';
  const jailRoleId = config?.robbank?.jailRoleId;

  switch (subcommand) {
    case 'release':
      await handleRelease(interaction, config, moneda, jailRoleId);
      break;
    case 'status':
      await handleStatus(interaction, config, moneda);
      break;
    case 'list':
      await handleList(interaction, config, moneda);
      break;
    case 'debug':
      await handleDebug(interaction, config, moneda);
      break;
    case 'cooldown-status':
      await handleCooldownStatus(interaction, config, moneda);
      break;
    case 'cooldown-reset':
      await handleCooldownReset(interaction, config, moneda);
      break;
  }
}

async function handleRelease(interaction, config, moneda, jailRoleId) {
  const targetUser = interaction.options.getUser('usuario');
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  // Verificar si el usuario está en la cárcel (revisar tanto la función como directamente el Map)
  const isJailed = isUserJailed(targetUser.id);
  const hasJailEntry = jailedUsers.has(targetUser.id);
  
  if (!isJailed && !hasJailEntry) {
    const notJailedEmbed = new EmbedBuilder()
      .setTitle('ℹ️ Usuario No Encarcelado')
      .setDescription(`**${targetUser.username}** no está actualmente en la cárcel.`)
      .setColor(0x3498db)
      .addFields({
        name: '🔍 Estado Detallado',
        value: `Verificación directa: ${hasJailEntry ? 'En cárcel' : 'Libre'}\nVerificación por función: ${isJailed ? 'En cárcel' : 'Libre'}`,
        inline: false
      });
    
    return interaction.reply({ embeds: [notJailedEmbed], flags: MessageFlags.Ephemeral });
  }

  // Liberar al usuario - forzar eliminación
  if (jailedUsers.has(targetUser.id)) {
    jailedUsers.delete(targetUser.id);
    console.log(`🔓 Admin release: Removed ${targetUser.username} (${targetUser.id}) from jail`);
  }

  // Log user release
  await logAdminCommand(interaction.user, 'admin-jail', {
    target: targetUser.username,
    result: 'RELEASED from jail',
    additional: 'User manually freed by admin'
  });

  // Remover el rol de cárcel si existe
  if (jailRoleId && targetMember) {
    try {
      await targetMember.roles.remove(jailRoleId);
    } catch (error) {
      console.error('Error removing jail role:', error);
    }
  }

  const releaseEmbed = new EmbedBuilder()
    .setTitle('🔓 Usuario Liberado')
    .setDescription(`**${targetUser.username}** ha sido liberado de la cárcel por un administrador.`)
    .setColor(0x2ecc71)
    .addFields(
      {
        name: '👮‍♂️ Administrador',
        value: interaction.user.username,
        inline: true
      },
      {
        name: '⏰ Liberación',
        value: 'Inmediata',
        inline: true
      }
    )
    .setTimestamp();

  // Notificar al usuario liberado (si está en el servidor)
  if (targetMember) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🔓 ¡Has Sido Liberado!')
        .setDescription(`Un administrador te ha liberado de la cárcel en **${interaction.guild.name}**.`)
        .setColor(0x2ecc71)
        .addFields({
          name: '✅ Acceso Restaurado',
          value: 'Ahora puedes usar todos los comandos económicos nuevamente.',
          inline: false
        });

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
      // Ignorar si no se puede enviar DM
    }
  }

  await interaction.reply({ embeds: [releaseEmbed] });
}

async function handleStatus(interaction, config, moneda) {
  const targetUser = interaction.options.getUser('usuario');
  const isJailed = isUserJailed(targetUser.id);
  const hasJailEntry = jailedUsers.has(targetUser.id);
  const jailEndTime = jailedUsers.get(targetUser.id);

  if (!isJailed && !hasJailEntry) {
    const freeEmbed = new EmbedBuilder()
      .setTitle('🆓 Usuario Libre')
      .setDescription(`**${targetUser.username}** no está en la cárcel.`)
      .setColor(0x2ecc71)
      .addFields(
        {
          name: '✅ Estado',
          value: 'Puede usar todos los comandos económicos normalmente.',
          inline: false
        },
        {
          name: '🔍 Debug Info',
          value: `Map Entry: ${hasJailEntry ? 'Sí' : 'No'}\nFunction Check: ${isJailed ? 'Encarcelado' : 'Libre'}\nTotal en cárcel: ${jailedUsers.size}`,
          inline: false
        }
      );

    return interaction.reply({ embeds: [freeEmbed], flags: MessageFlags.Ephemeral });
  }

  // Calcular tiempo restante
  const timeLeft = Math.ceil((jailEndTime - Date.now()) / (1000 * 60)); // minutos
  
  const jailEmbed = new EmbedBuilder()
    .setTitle('🔒 Usuario Encarcelado')
    .setDescription(`**${targetUser.username}** está actualmente en la cárcel.`)
    .setColor(0xe74c3c)
    .addFields(
      {
        name: '⏰ Tiempo Restante',
        value: `${timeLeft} minutos`,
        inline: true
      },
      {
        name: '🚫 Restricciones',
        value: 'No puede usar comandos económicos',
        inline: true
      },
      {
        name: '📄 Motivo',
        value: 'Robo de banco fallido',
        inline: false
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [jailEmbed], flags: MessageFlags.Ephemeral });
}

async function handleList(interaction, config, moneda) {
  if (!jailedUsers || jailedUsers.size === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setTitle('🏛️ Cárcel Vacía')
      .setDescription('No hay usuarios actualmente encarcelados.')
      .setColor(0x2ecc71);

    return interaction.reply({ embeds: [emptyEmbed], flags: MessageFlags.Ephemeral });
  }

  let jailList = '';
  let activeJails = 0;

  for (const [userId, jailEnd] of jailedUsers) {
    const timeLeft = Math.ceil((jailEnd - Date.now()) / 60000);
    if (timeLeft > 0) {
      try {
        const user = await interaction.client.users.fetch(userId);
        jailList += `🔒 **${user.username}** - ${timeLeft} minutos restantes\n`;
        activeJails++;
      } catch (error) {
        // Usuario no encontrado, limpiar entrada
        jailedUsers.delete(userId);
      }
    } else {
      // Tiempo expirado, limpiar entrada
      jailedUsers.delete(userId);
    }
  }

  if (activeJails === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setTitle('🏛️ Cárcel Vacía')
      .setDescription('No hay usuarios actualmente encarcelados.')
      .setColor(0x2ecc71);

    return interaction.reply({ embeds: [emptyEmbed], flags: MessageFlags.Ephemeral });
  }

  const listEmbed = new EmbedBuilder()
    .setTitle('🏛️ Usuarios Encarcelados')
    .setDescription(`**${activeJails} usuario${activeJails > 1 ? 's' : ''} en la cárcel:**\n\n${jailList}`)
    .setColor(0xf39c12)
    .addFields({
      name: '🔧 Administración',
      value: 'Usa `/admin-jail release @usuario` para liberar a alguien',
      inline: false
    })
    .setTimestamp();

  await interaction.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
}

async function handleDebug(interaction, config, moneda) {
  const now = Date.now();
  let debugInfo = '';
  
  if (jailedUsers.size === 0) {
    debugInfo = 'No hay entradas en jailedUsers Map';
  } else {
    debugInfo += `**Total entradas en Map:** ${jailedUsers.size}\n\n`;
    
    for (const [userId, jailEnd] of jailedUsers) {
      const timeLeft = Math.ceil((jailEnd - now) / 60000);
      const isExpired = now >= jailEnd;
      const status = isExpired ? '❌ Expirado' : `⏰ ${timeLeft} min`;
      
      try {
        const user = await interaction.client.users.fetch(userId);
        debugInfo += `🔒 **${user.username}** (${userId})\n   ${status}\n   Expires: <t:${Math.floor(jailEnd / 1000)}:F>\n\n`;
      } catch (error) {
        debugInfo += `🔒 **Usuario Desconocido** (${userId})\n   ${status}\n   Expires: <t:${Math.floor(jailEnd / 1000)}:F>\n\n`;
      }
    }
  }
  
  const debugEmbed = new EmbedBuilder()
    .setTitle('🔧 Debug - Sistema de Cárcel')
    .setDescription(debugInfo)
    .setColor(0x9b59b6)
    .addFields(
      {
        name: '📊 Estadísticas',
        value: `Map Size: ${jailedUsers.size}\nTimestamp actual: <t:${Math.floor(now / 1000)}:F>`,
        inline: false
      },
      {
        name: '🛠️ Acciones',
        value: 'Este comando limpia automáticamente entradas expiradas',
        inline: false
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [debugEmbed], flags: MessageFlags.Ephemeral });
}

async function handleCooldownStatus(interaction, config, moneda) {
  const targetUser = interaction.options.getUser('usuario');
  const now = Date.now();
  
  let statusInfo = `👤 **Usuario:** ${targetUser.username} (${targetUser.id})\n\n`;
  
  // Verificar cooldown del robbank
  if (robbankCooldowns.has(targetUser.id)) {
    const cooldownEnd = robbankCooldowns.get(targetUser.id);
    if (now < cooldownEnd) {
      const timeLeft = Math.ceil((cooldownEnd - now) / 1000 / 60); // minutos
      statusInfo += `⏰ **Cooldown Activo**\n🕐 Tiempo restante: ${timeLeft} minutos\n⏳ Termina: <t:${Math.floor(cooldownEnd / 1000)}:R>`;
    } else {
      statusInfo += `✅ **Sin Cooldown**\n🆓 Puede robar bancos libremente`;
      // Limpiar cooldown expirado
      robbankCooldowns.delete(targetUser.id);
    }
  } else {
    statusInfo += `✅ **Sin Cooldown**\n🆓 Puede robar bancos libremente`;
  }

  const statusEmbed = new EmbedBuilder()
    .setTitle('⏰ Estado de Cooldown - RobBank')
    .setDescription(statusInfo)
    .setColor(robbankCooldowns.has(targetUser.id) ? 0xe74c3c : 0x2ecc71)
    .setTimestamp();

  await interaction.reply({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });

  // Log de la acción admin
  await logAdminCommand(interaction.user, 'admin-jail cooldown-status', { details: `Verificó cooldown de ${targetUser.username}` });
}

async function handleCooldownReset(interaction, config, moneda) {
  const targetUser = interaction.options.getUser('usuario');
  
  // Verificar si tiene cooldown activo
  const hadCooldown = robbankCooldowns.has(targetUser.id);
  
  if (hadCooldown) {
    // Eliminar el cooldown
    robbankCooldowns.delete(targetUser.id);
    
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Cooldown Reseteado')
      .setDescription(`🔄 **Cooldown eliminado para:** ${targetUser.username}\n\n🎯 El usuario puede volver a usar \`/robbank\` inmediatamente`)
      .setColor(0x2ecc71)
      .setTimestamp();
    
    await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    
    // Log de la acción admin
    await logAdminCommand(interaction.user, 'admin-jail cooldown-reset', { details: `Reseteó cooldown de robbank para ${targetUser.username}` });
  } else {
    const noActionEmbed = new EmbedBuilder()
      .setTitle('ℹ️ Sin Acción Necesaria')
      .setDescription(`👤 **Usuario:** ${targetUser.username}\n\n✅ Este usuario no tiene cooldown activo de robbank`)
      .setColor(0x3498db)
      .setTimestamp();
    
    await interaction.reply({ embeds: [noActionEmbed], flags: MessageFlags.Ephemeral });
  }
}