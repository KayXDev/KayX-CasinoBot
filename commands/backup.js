// ═══════════════════════════════════════════════════════════════
// 💾 COMANDO BACKUP MANUAL Y RESTAURACIÓN
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createServerBackup, getBackups, restoreBackup } from '../util/backupSystem.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('💾 Realiza un backup manual o restaura la estructura del servidor')
  .addSubcommand(sub =>
    sub.setName('crear')
      .setDescription('Crear un backup manual del servidor'))
  .addSubcommand(sub =>
    sub.setName('listar')
      .setDescription('Listar los últimos backups guardados'))
  .addSubcommand(sub =>
    sub.setName('restaurar')
      .setDescription('Restaurar el último backup guardado'));

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

  // Log gambling command
  await logGamblingCommand(interaction.user, 'backup', {
    action: 'executed'
  });

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === 'crear') {
    try {
      await createServerBackup(guild);
      await interaction.reply({ 
        content: '✅ Backup iniciado. Revisa el canal de notificaciones para más detalles.', 
        flags: MessageFlags.Ephemeral 
      });
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Error al crear el backup. Revisa los logs del servidor.', 
        flags: MessageFlags.Ephemeral 
      });
    }
    
  } else if (sub === 'listar') {
    const backups = await getBackups(guild.id);
    
    if (!backups || backups.length === 0) {
      const noBackupsEmbed = new EmbedBuilder()
        .setTitle('📋 Server Backups | Empty')
        .setDescription('**No backups found for this server.**\n\n💡 *Create your first backup with `/backup crear`*')
        .setColor(0xe74c3c)
        .setThumbnail('https://i.imgur.com/0jM0J5h.png')
        .addFields({
          name: '🚀 Get Started',
          value: '```• Use /backup crear to create a manual backup\n• Automatic backups run every 6 hours\n• Up to 10 backups are kept in storage```',
          inline: false
        })
        .setFooter({ text: 'Backup System • No backups available' })
        .setTimestamp();
      
      return await interaction.reply({ embeds: [noBackupsEmbed], flags: MessageFlags.Ephemeral });
    }

    let backupsList = '';
    backups.forEach((backup, index) => {
      const date = new Date(backup.createdAt);
      const timestamp = Math.floor(date.getTime() / 1000);
      backupsList += `**#${index + 1}** - <t:${timestamp}:F>\n`;
      backupsList += `   └ \`${backup.channels.length} channels, ${backup.roles.length} roles\`\n\n`;
    });

    const listEmbed = new EmbedBuilder()
      .setTitle('📋 Server Backups | Available')
      .setDescription(`**Backup history for ${guild.name}**\n\n🗄️ *${backups.length} backups available*`)
      .setColor(0x3498db)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png')
      .addFields(
        {
          name: '📚 Backup List',
          value: backupsList,
          inline: false
        },
        {
          name: '💡 Instructions',
          value: '```• Use /backup restaurar to restore the latest backup\n• Backups are ordered from newest to oldest\n• Only server structure is backed up (no messages)```',
          inline: false
        }
      )
      .setFooter({ 
        text: `${backups.length} backups available • Latest: ${new Date(backups[0].createdAt).toLocaleDateString()}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
    
  } else if (sub === 'restaurar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const backups = await getBackups(guild.id);
    if (!backups || backups.length === 0) {
      const noBackupsEmbed = new EmbedBuilder()
        .setTitle('❌ Restore Failed')
        .setDescription('**No backups available to restore.**\n\n💡 *Create a backup first with `/backup crear`*')
        .setColor(0xe74c3c);
      return await interaction.editReply({ embeds: [noBackupsEmbed] });
    }

    try {
      const backup = await restoreBackup(guild, backups[0].id);
      
      const restoreEmbed = new EmbedBuilder()
        .setTitle('♻️ Server Restore | Success')
        .setDescription(`**Server restoration completed, ${interaction.user.username}!**\n\n🏗️ *Your server structure has been restored from backup*`)
        .setColor(0xffa500)
        .setThumbnail('https://i.imgur.com/0jM0J5h.png')
        .addFields(
          {
            name: '📊 Restored Elements',
            value: `\`\`\`📁 Channels: ${backup.channels.length}\n👥 Roles: ${backup.roles.length}\n😀 Emojis: ${backup.emojis.length}\n📂 Categories: ${backup.categories.length}\n🏰 Server: ${backup.name}\`\`\``,
            inline: false
          },
          {
            name: '🕐 Backup Source',
            value: `**Backup Date:** <t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>\n**Restoration:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Type:** Complete structure restore`,
            inline: false
          },
          {
            name: '⚠️ Important Notes',
            value: '```• Only server structure was restored\n• Messages and members are not affected\n• Existing channels/roles were preserved\n• Check server settings if needed```',
            inline: false
          }
        )
        .setFooter({ 
          text: 'Backup System • Server restoration completed',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [restoreEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Restore Failed')
        .setDescription('An error occurred during the restoration process.')
        .setColor(0xff0000);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}
