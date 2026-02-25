// ═══════════════════════════════════════════════════════════════
// 💰 ADMIN RESET BALANCE - Sistema de Reset de Balance de Usuario
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('admin-resetbalance')
  .setDescription('🔧 [ADMIN] Reset a user\'s balance (hand + bank) to 0')
  .addSubcommand(subcommand =>
    subcommand
      .setName('user')
      .setDescription('Reset a specific user\'s balance to 0')
      .addUserOption(option =>
        option.setName('target')
          .setDescription('User to reset balance')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for the balance reset')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('self')
      .setDescription('Reset your own balance to 0 (admin only)')
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for the balance reset')
          .setRequired(false)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, config) {
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

  const subcommand = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason') || 'Sin razón especificada';
  const moneda = config.casino?.moneda || '💰';

  let targetUser;
  if (subcommand === 'user') {
    targetUser = interaction.options.getUser('target');
  } else {
    targetUser = interaction.user;
  }

  try {
    // Asegurar que el usuario existe en la base de datos
    await addUserIfNotExists(targetUser.id);
    
    // Obtener balance actual del usuario
    const currentBalances = await getUserBalances(targetUser.id);
    const totalBefore = currentBalances.hand + currentBalances.bank;

    // Si ya tiene balance 0, no hacer nada
    if (totalBefore === 0) {
      return interaction.reply({
        content: `ℹ️ **${targetUser.tag}** ya tiene su balance en 0 ${moneda}`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Crear embed de confirmación
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmación de Reset de Balance')
      .setColor(0xff6b35)
      .setDescription(`**¿Estás seguro de que quieres resetear el balance completo?**`)
      .addFields([
        {
          name: '👤 Usuario Objetivo',
          value: `${targetUser.tag} (${targetUser.id})`,
          inline: true
        },
        {
          name: '💰 Balance Actual',
          value: `\`\`\`💵 En Mano: ${currentBalances.hand.toLocaleString()} ${moneda}\n🏦 En Banco: ${currentBalances.bank.toLocaleString()} ${moneda}\n💎 Total: ${totalBefore.toLocaleString()} ${moneda}\`\`\``,
          inline: false
        },
        {
          name: '🔄 Nuevo Balance',
          value: `\`\`\`💵 En Mano: 0 ${moneda}\n🏦 En Banco: 0 ${moneda}\n💎 Total: 0 ${moneda}\`\`\``,
          inline: false
        },
        {
          name: '📝 Razón',
          value: `\`${reason}\``,
          inline: false
        }
      ])
      .setFooter({ text: 'Esta acción no se puede deshacer' });

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_reset')
          .setLabel('✅ Confirmar Reset')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_reset')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );

    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [buttons],
      flags: MessageFlags.Ephemeral
    });

    // Collector para los botones
    const collector = response.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (buttonInteraction) => {
      // Verificar que quien presiona el botón es quien ejecutó el comando
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: '🚫 Solo quien ejecutó el comando puede confirmar esta acción',
          flags: MessageFlags.Ephemeral
        });
      }

      // Verificar permisos nuevamente
      const stillHasPerms = buttonInteraction.member.roles.cache.some(role => adminRoles.includes(role.id)) || 
                           buttonInteraction.user.id === config.ownerID;
      
      if (!stillHasPerms) {
        return buttonInteraction.reply({
          content: '🚫 **PERMISOS INSUFICIENTES** - Ya no tienes permisos de administrador',
          flags: MessageFlags.Ephemeral
        });
      }

      if (buttonInteraction.customId === 'confirm_reset') {
        // Procesar el reset del balance
        await processBalanceReset(buttonInteraction, targetUser, currentBalances, totalBefore, reason, moneda, config);
      } else if (buttonInteraction.customId === 'cancel_reset') {
        // Cancelar la acción
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Reset Cancelado')
          .setColor(0x95a5a6)
          .setDescription('**El reset de balance ha sido cancelado**\n\n💡 *No se realizó ningún cambio en la cuenta del usuario*')
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
          .setDescription('**La confirmación expiró**\n\n💡 *El reset de balance fue cancelado por inactividad*')
          .setFooter({ text: 'Casino Bot • Tiempo Agotado' });

        try {
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        } catch (error) {
          // Ignorar errores de interacción expirada
        }
      }
    });

  } catch (error) {
    console.error('Error in admin-resetbalance:', error);
    await interaction.reply({
      content: '❌ **ERROR** - Ocurrió un error al procesar el reset de balance',
      flags: MessageFlags.Ephemeral
    });
  }
}

// ═══════════════════════════════════════════════════════════════

async function processBalanceReset(buttonInteraction, targetUser, originalBalances, totalBefore, reason, moneda, config) {
  try {
    // Mostrar embed de procesamiento
    const processingEmbed = new EmbedBuilder()
      .setTitle('⚙️ Procesando Reset de Balance...')
      .setColor(0x3498db)
      .setDescription('**Reseteando balance del usuario**\n\n⏳ *Por favor espera, esto tomará un momento*')
      .addFields([
        {
          name: '📊 Progreso',
          value: `\`\`\`⏳ Procesando usuario: ${targetUser.tag}\n💰 Reseteando balances...\n🔄 Aplicando cambios...\`\`\``,
          inline: false
        }
      ])
      .setFooter({ text: 'Casino Bot • Procesando...' });

    await buttonInteraction.update({
      embeds: [processingEmbed],
      components: []
    });

    // Resetear balance a 0 (mano y banco)
    await setUserBalances(targetUser.id, 0, 0);

    // Log del comando administrativo
    await logAdminCommand(buttonInteraction.user, 'admin-resetbalance', {
      target: `${targetUser.tag} (${targetUser.id})`,
      amount: `Resetted from ${totalBefore.toLocaleString()} ${moneda} to 0`,
      reason: reason,
      additional: `Hand: ${originalBalances.hand} → 0 | Bank: ${originalBalances.bank} → 0`
    });

    // Crear embed de resultado
    const resultEmbed = new EmbedBuilder()
      .setTitle('✅ Balance Reseteado Exitosamente')
      .setColor(0x00ff00)
      .setDescription(`**¡El balance de ${targetUser.tag} ha sido reseteado!**\n\n🔄 *Todas las monedas han sido removidas*`)
      .addFields([
        {
          name: '👤 Usuario Afectado',
          value: `${targetUser.tag}\n\`${targetUser.id}\``,
          inline: true
        },
        {
          name: '💰 Balance Anterior',
          value: `\`\`\`💵 En Mano: ${originalBalances.hand.toLocaleString()}\n🏦 En Banco: ${originalBalances.bank.toLocaleString()}\n💎 Total: ${totalBefore.toLocaleString()} ${moneda}\`\`\``,
          inline: true
        },
        {
          name: '🆕 Nuevo Balance',
          value: `\`\`\`💵 En Mano: 0\n🏦 En Banco: 0\n💎 Total: 0 ${moneda}\`\`\``,
          inline: true
        },
        {
          name: '📝 Razón del Reset',
          value: `\`${reason}\``,
          inline: false
        },
        {
          name: '👑 Administrador',
          value: `${buttonInteraction.user.tag}`,
          inline: true
        },
        {
          name: '⏰ Fecha y Hora',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      ])
      .setFooter({ text: 'Casino Bot • Reset Completado' });

    await buttonInteraction.editReply({
      embeds: [resultEmbed],
      components: []
    });

    // Enviar mensaje directo al usuario afectado (si no es el mismo admin)
    if (targetUser.id !== buttonInteraction.user.id) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('💰 Balance Reseteado')
          .setColor(0xff6b35)
          .setDescription('**Tu balance en el casino ha sido reseteado por un administrador**')
          .addFields([
            {
              name: '🔄 Cambios Realizados',
              value: `\`\`\`💰 ${totalBefore.toLocaleString()} ${moneda} → 0 ${moneda}\n💵 Dinero en mano: 0\n🏦 Dinero en banco: 0\`\`\``,
              inline: false
            },
            {
              name: '📝 Razón',
              value: `\`${reason}\``,
              inline: false
            }
          ])
          .setFooter({ text: 'Casino Bot • Notificación Administrativa' });

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`No se pudo enviar DM a ${targetUser.tag}:`, dmError.message);
      }
    }

  } catch (error) {
    console.error('Error processing balance reset:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error al Resetear Balance')
      .setColor(0xff0000)
      .setDescription('**Ocurrió un error al resetear el balance**\n\n🔧 *Por favor intenta nuevamente o contacta al desarrollador*')
      .addFields([
        {
          name: '🐛 Error',
          value: `\`\`\`${error.message}\`\`\``,
          inline: false
        }
      ])
      .setFooter({ text: 'Casino Bot • Error' });

    await buttonInteraction.editReply({
      embeds: [errorEmbed],
      components: []
    });
  }
}