import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { query } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('admin-status')
  .setDescription('🤖 Manage bot status messages and presence configuration')
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('📋 View all current bot statuses')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('➕ Add a new bot status')
      .addStringOption(option =>
        option.setName('text')
          .setDescription('Status text to display')
          .setRequired(true)
          .setMaxLength(255)
      )
      .addStringOption(option =>
        option.setName('type')
          .setDescription('Activity type')
          .setRequired(false)
          .addChoices(
            { name: '🎮 Playing', value: 'PLAYING' },
            { name: '📺 Watching', value: 'WATCHING' },
            { name: '🎵 Listening', value: 'LISTENING' },
            { name: '🔴 Streaming', value: 'STREAMING' },
            { name: '💬 Custom', value: 'CUSTOM' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('🗑️ Remove a bot status')
      .addIntegerOption(option =>
        option.setName('id')
          .setDescription('Status ID to remove')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('toggle')
      .setDescription('🔄 Toggle a status on/off')
      .addIntegerOption(option =>
        option.setName('id')
          .setDescription('Status ID to toggle')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('config')
      .setDescription('⚙️ Configure status system settings')
      .addIntegerOption(option =>
        option.setName('interval')
          .setDescription('Update interval in seconds (minimum 5)')
          .setRequired(false)
          .setMinValue(5)
          .setMaxValue(3600)
      )
      .addBooleanOption(option =>
        option.setName('enabled')
          .setDescription('Enable/disable automatic status rotation')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('refresh')
      .setDescription('🔄 Immediately refresh bot status from database')
  );

export async function execute(interaction, config) {
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

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'list':
        await handleListStatuses(interaction, moneda);
        break;
      case 'add':
        await handleAddStatus(interaction, moneda);
        break;
      case 'remove':
        await handleRemoveStatus(interaction, moneda);
        break;
      case 'toggle':
        await handleToggleStatus(interaction, moneda);
        break;
      case 'config':
        await handleConfigStatus(interaction, moneda);
        break;
      case 'refresh':
        await handleRefreshStatus(interaction, moneda);
        break;
    }
  } catch (error) {
    console.error('Error in admin-status command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Command Error')
      .setDescription('**An error occurred while processing your request**\n\n🔧 *Please try again or contact support*')
      .setColor(0xe74c3c)
      .addFields({
        name: '🐛 Error Details',
        value: `\`\`\`${error.message}\`\`\``,
        inline: false
      })
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

async function handleListStatuses(interaction, moneda) {
  // Obtener todos los status
  const statuses = await query('SELECT * FROM bot_status ORDER BY id ASC');
  const configData = await query('SELECT * FROM bot_status_config');
  
  // Convertir config a objeto
  const configObj = {};
  configData.forEach(row => {
    configObj[row.setting_name] = row.setting_value;
  });

  const embed = new EmbedBuilder()
    .setTitle('🤖 Bot Status Management Center')
    .setDescription('**Current bot status configuration and active messages**\n\n🔄 *Managing your bot\'s presence across Discord*')
    .setColor(0x3498db)
    .setThumbnail('https://i.imgur.com/0jM0J5h.png');

  // Configuración actual
  const interval = parseInt(configObj.presenceUpdateInterval || '10000') / 1000;
  const enabled = configObj.enabled === 'true';
  
  embed.addFields({
    name: '⚙️ Current Configuration',
    value: `\`\`\`🔄 Auto-rotation: ${enabled ? 'ENABLED' : 'DISABLED'}\n⏱️ Update Interval: ${interval}s\n📊 Total Statuses: ${statuses.length}\n✅ Active Statuses: ${statuses.filter(s => s.is_active).length}\`\`\``,
    inline: false
  });

  // Lista de status
  if (statuses.length > 0) {
    let statusList = '';
    statuses.forEach(status => {
      const statusIcon = status.is_active ? '✅' : '❌';
      const typeEmoji = getTypeEmoji(status.type);
      statusList += `${statusIcon} **ID ${status.id}** | ${typeEmoji} ${status.type}\n`;
      statusList += `   └ \`${status.text}\`\n\n`;
    });

    embed.addFields({
      name: '📋 Status Messages',
      value: statusList || 'No status messages configured',
      inline: false
    });
  } else {
    embed.addFields({
      name: '📋 Status Messages',
      value: '```No status messages configured```',
      inline: false
    });
  }

  embed.addFields({
    name: '💡 Quick Commands',
    value: '```/admin-status add [text] [type] - Add new status\n/admin-status remove [id] - Remove status\n/admin-status toggle [id] - Enable/disable status\n/admin-status config - Change settings```',
    inline: false
  });

  embed.setFooter({ text: `Status System | Last updated` });
  embed.setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleAddStatus(interaction, moneda) {
  const text = interaction.options.getString('text');
  const type = interaction.options.getString('type') || 'CUSTOM';

  // Insertar nuevo status
  const result = await query(
    'INSERT INTO bot_status (text, type, is_active) VALUES (?, ?, TRUE)',
    [text, type]
  );

  const embed = new EmbedBuilder()
    .setTitle('✅ Status Added Successfully')
    .setDescription('**New bot status has been created and activated**\n\n🎯 *Your bot will now display this status in rotation*')
    .setColor(0x27ae60)
    .addFields(
      {
        name: '🆔 Status ID',
        value: `\`${result.insertId}\``,
        inline: true
      },
      {
        name: '📝 Status Text',
        value: `\`${text}\``,
        inline: true
      },
      {
        name: '📊 Activity Type',
        value: `${getTypeEmoji(type)} \`${type}\``,
        inline: true
      }
    )
    .setFooter({ text: 'Status will be active on next rotation cycle' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Log admin command
  await logAdminCommand(interaction.user, 'admin-status add', {
    status_id: result.insertId,
    status_text: text,
    activity_type: type
  });
}

async function handleRemoveStatus(interaction, moneda) {
  const statusId = interaction.options.getInteger('id');

  // Verificar que el status existe
  const status = await query('SELECT * FROM bot_status WHERE id = ?', [statusId]);
  
  if (status.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Status Not Found')
      .setDescription('**The specified status ID does not exist**\n\n🔍 *Use `/admin-status list` to see available status IDs*')
      .setColor(0xe74c3c)
      .addFields({
        name: '🆔 Requested ID',
        value: `\`${statusId}\``,
        inline: true
      })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Eliminar el status
  await query('DELETE FROM bot_status WHERE id = ?', [statusId]);

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Status Removed Successfully')
    .setDescription('**Bot status has been permanently deleted**\n\n♻️ *Changes will take effect on next rotation cycle*')
    .setColor(0xf39c12)
    .addFields(
      {
        name: '🆔 Removed ID',
        value: `\`${statusId}\``,
        inline: true
      },
      {
        name: '📝 Removed Text',
        value: `\`${status[0].text}\``,
        inline: false
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleToggleStatus(interaction, moneda) {
  const statusId = interaction.options.getInteger('id');

  // Obtener status actual
  const status = await query('SELECT * FROM bot_status WHERE id = ?', [statusId]);
  
  if (status.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Status Not Found')
      .setDescription('**The specified status ID does not exist**\n\n🔍 *Use `/admin-status list` to see available status IDs*')
      .setColor(0xe74c3c)
      .addFields({
        name: '🆔 Requested ID',
        value: `\`${statusId}\``,
        inline: true
      })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  const newState = !status[0].is_active;
  
  // Actualizar estado
  await query('UPDATE bot_status SET is_active = ? WHERE id = ?', [newState, statusId]);

  const embed = new EmbedBuilder()
    .setTitle(`🔄 Status ${newState ? 'Enabled' : 'Disabled'}`)
    .setDescription(`**Bot status has been ${newState ? 'activated' : 'deactivated'}**\n\n${newState ? '✅' : '❌'} *Changes will take effect on next rotation cycle*`)
    .setColor(newState ? 0x27ae60 : 0xe74c3c)
    .addFields(
      {
        name: '🆔 Status ID',
        value: `\`${statusId}\``,
        inline: true
      },
      {
        name: '📝 Status Text',
        value: `\`${status[0].text}\``,
        inline: true
      },
      {
        name: '📊 New State',
        value: `${newState ? '✅ ACTIVE' : '❌ INACTIVE'}`,
        inline: true
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleConfigStatus(interaction, moneda) {
  const interval = interaction.options.getInteger('interval');
  const enabled = interaction.options.getBoolean('enabled');

  let updates = [];
  let changes = [];

  if (interval !== null) {
    const intervalMs = interval * 1000;
    await query(
      'INSERT INTO bot_status_config (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['presenceUpdateInterval', intervalMs.toString()]
    );
    updates.push(`⏱️ Update interval set to ${interval} seconds`);
    changes.push(`Interval: ${interval}s`);
  }

  if (enabled !== null) {
    await query(
      'INSERT INTO bot_status_config (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['enabled', enabled.toString()]
    );
    updates.push(`🔄 Auto-rotation ${enabled ? 'enabled' : 'disabled'}`);
    changes.push(`Auto-rotation: ${enabled ? 'ON' : 'OFF'}`);
  }

  if (updates.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Status System Configuration')
      .setDescription('**No changes were specified**\n\n💡 *Provide interval and/or enabled parameters to update configuration*')
      .setColor(0xf39c12)
      .addFields({
        name: '📋 Available Options',
        value: '```interval: Update frequency (5-3600 seconds)\nenabled: Enable/disable auto-rotation (true/false)```',
        inline: false
      })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Configuration Updated')
    .setDescription('**Bot status system configuration has been updated**\n\n🔄 *Changes will take effect on next bot restart or manual reload*')
    .setColor(0x27ae60)
    .addFields({
      name: '📊 Applied Changes',
      value: `\`\`\`${changes.join('\n')}\`\`\``,
      inline: false
    })
    .addFields({
      name: '💡 Note',
      value: '```Some changes may require a bot restart to take full effect```',
      inline: false
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleRefreshStatus(interaction, moneda) {
  try {
    // Verificar si el sistema de status está habilitado
    const statusConfig = await query('SELECT setting_name, setting_value FROM bot_status_config');
    const configObj = {};
    statusConfig.forEach(row => {
      configObj[row.setting_name] = row.setting_value;
    });

    const enabled = configObj.enabled === 'true';
    
    if (!enabled) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Status System Disabled')
        .setDescription('**The status rotation system is currently disabled**\n\n⚙️ *Use `/admin-status config enabled:true` to enable it first*')
        .setColor(0xf39c12)
        .addFields({
          name: '💡 How to Enable',
          value: '```/admin-status config enabled:true```',
          inline: false
        })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    // Obtener status activos antes del refresh
    const activeStatuses = await query('SELECT * FROM bot_status WHERE is_active = TRUE ORDER BY id ASC');
    
    if (activeStatuses.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Active Statuses')
        .setDescription('**No active status messages found in database**\n\n➕ *Add some status messages first using `/admin-status add`*')
        .setColor(0xe74c3c)
        .addFields({
          name: '💡 Add Status Example',
          value: '```/admin-status add text:"Your status here" type:CUSTOM```',
          inline: false
        })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    // Usar la función global de refresh si está disponible
    let refreshResult;
    if (global.refreshBotStatus) {
      refreshResult = await global.refreshBotStatus();
    } else {
      // Fallback manual si la función global no está disponible
      const client = interaction.client;
      const firstStatus = activeStatuses[0];
      
      await client.user.setPresence({
        activities: [{
          name: firstStatus.text,
          type: 4 // CUSTOM type
        }],
        status: 'online'
      });
      
      refreshResult = { success: true, statusCount: activeStatuses.length };
    }

    if (refreshResult.success) {
      const firstStatus = activeStatuses[0];
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Status Refreshed Successfully')
        .setDescription('**Bot status has been refreshed from database immediately**\n\n✅ *Status rotation system updated with latest changes*')
        .setColor(0x27ae60)
        .addFields(
          {
            name: '📊 Active Statuses Loaded',
            value: `\`${refreshResult.statusCount || activeStatuses.length}\` status messages`,
            inline: true
          },
          {
            name: '🎯 Current Status Applied',
            value: `\`${firstStatus.text}\``,
            inline: true
          },
          {
            name: '📋 Activity Type',
            value: `${getTypeEmoji(firstStatus.type)} \`${firstStatus.type}\``,
            inline: true
          }
        )
        .addFields({
          name: '🔄 System Status',
          value: `\`\`\`⏱️ Interval: ${Math.floor(parseInt(configObj.presenceUpdateInterval || '10000') / 1000)}s\n📈 Queue: ${activeStatuses.length} statuses in rotation\n🔄 Auto-refresh: Every 5 minutes from database\n✅ Immediate refresh: APPLIED\`\`\``,
          inline: false
        })
        .setFooter({ text: 'Status system | Changes applied instantly' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      throw new Error(refreshResult.error || 'Unknown refresh error');
    }

  } catch (error) {
    console.error('Error in refresh status:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Refresh Failed')
      .setDescription('**An error occurred while refreshing bot status**\n\n🔧 *Please check console logs or try again*')
      .setColor(0xe74c3c)
      .addFields({
        name: '🐛 Error Details',
        value: `\`\`\`${error.message}\`\`\``,
        inline: false
      })
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed] });
  }
}

function getTypeEmoji(type) {
  const emojis = {
    'PLAYING': '🎮',
    'WATCHING': '📺',
    'LISTENING': '🎵',
    'STREAMING': '🔴',
    'CUSTOM': '💬'
  };
  return emojis[type] || '💬';
}