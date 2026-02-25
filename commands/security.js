import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { 
  SECURITY_CONFIG, 
  toggleTestingMode, 
  addToWhitelist,
  removeFromWhitelist,
  getSecurityStats,
  logSecurityEvent 
} from '../util/securitySystem.js';
import fs from 'fs';
import yaml from 'js-yaml';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('security')
  .setDescription('🛡️ Manage bot security system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand.setName('status')
      .setDescription('View current security status'))
  .addSubcommand(subcommand =>
    subcommand.setName('toggle-testing')
      .setDescription('Enable/disable testing mode')
      .addBooleanOption(option =>
        option.setName('enabled')
          .setDescription('true = enable testing, false = disable')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand.setName('whitelist-add')
      .setDescription('Add user to whitelist')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to add')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand.setName('whitelist-remove')
      .setDescription('Remove user from whitelist')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to remove')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand.setName('emergency-stop')
      .setDescription('🚨 EMERGENCY BOT STOP - Only use in crisis')
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for emergency stop')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand.setName('emergency-restore')
      .setDescription('🔧 Restore bot from emergency mode'));

export async function execute(interaction, config) {
  const ownerID = config.ownerID;
  
  // Only the owner can use this command
  if (interaction.user.id !== ownerID) {
    const embed = new EmbedBuilder()
      .setTitle('🚫 Access Denied')
      .setColor(0xFF0000)
      .setDescription('Only the bot owner can use this command.');
    
    return 
  // Log gambling command
  await logGamblingCommand(interaction.user, 'security', {
    action: 'executed'
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  const subcommand = interaction.options.getSubcommand();
  const moneda = config?.casino?.moneda || '💰';

  try {
    switch (subcommand) {
      case 'status':
        await handleStatus(interaction, moneda);
        break;
      case 'toggle-testing':
        await handleToggleTesting(interaction, moneda);
        break;
      case 'whitelist-add':
        await handleWhitelistAdd(interaction, moneda);
        break;
      case 'whitelist-remove':
        await handleWhitelistRemove(interaction, moneda);
        break;
      case 'emergency-stop':
        await handleEmergencyStop(interaction, moneda);
        break;
      case 'emergency-restore':
        await handleEmergencyRestore(interaction, moneda);
        break;
    }
  } catch (error) {
    console.error('Error in security command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ Error')
      .setColor(0xFF0000)
      .setDescription('An error occurred while executing the security command.');
    
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

async function handleStatus(interaction, moneda) {
  const stats = getSecurityStats();
  
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Security System Status')
    .setColor(stats.testingMode ? 0xFFAA00 : 0x00AA00)
    .setDescription('**Bot protection system information**')
    .addFields(
      {
        name: '🧪 Testing Mode',
        value: `\`\`\`${stats.testingMode ? '🟡 ENABLED' : '🟢 DISABLED'}\`\`\``,
        inline: true
      },
      {
        name: '👥 Authorized Users',
        value: `\`\`\`${stats.whitelistUsers} users\`\`\``,
        inline: true
      },
      {
        name: '🚫 Blocked Users',
        value: `\`\`\`${stats.blacklistUsers} users\`\`\``,
        inline: true
      },
      {
        name: '🎭 Authorized Roles',
        value: `\`\`\`${stats.authorizedRoles} roles\`\`\``,
        inline: true
      },
      {
        name: '🔒 Blocked Channels',
        value: `\`\`\`${stats.blockedChannels} channels\`\`\``,
        inline: true
      },
      {
        name: '⚡ Rate Limiting',
        value: `\`\`\`🟢 ACTIVE\`\`\``,
        inline: true
      }
    );

  if (stats.testingMode) {
    embed.addFields({
      name: '⚠️ Active Testing Limits',
      value: `\`\`\`yaml
💰 Max Bet: ${SECURITY_CONFIG.TESTING_LIMITS.MAX_BET.toLocaleString()}
💎 Max Balance: ${SECURITY_CONFIG.TESTING_LIMITS.MAX_BALANCE.toLocaleString()}
📈 Max Crypto Investment: ${SECURITY_CONFIG.TESTING_LIMITS.MAX_CRYPTO_INVESTMENT.toLocaleString()}
⏱️ Cooldowns: x${SECURITY_CONFIG.TESTING_LIMITS.COOLDOWN_MULTIPLIER}\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ 
    text: `🛡️ Security System • Currency: ${moneda}`,
    iconURL: 'https://i.imgur.com/hMwxvcd.png'
  })
  .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleToggleTesting(interaction, moneda) {
  const enabled = interaction.options.getBoolean('enabled');
  const previousState = SECURITY_CONFIG.TESTING_MODE;
  
  toggleTestingMode(enabled);
  
  logSecurityEvent('TESTING_MODE_CHANGED', interaction.user.id, {
    previousState,
    newState: enabled
  });

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Testing Mode Updated')
    .setColor(enabled ? 0xFFAA00 : 0x00AA00)
    .setDescription(`**Testing mode ${enabled ? 'ENABLED' : 'DISABLED'}**`)
    .addFields({
      name: enabled ? '🧪 Testing Enabled' : '🚀 Production Enabled',
      value: enabled 
        ? `\`\`\`yaml
🎯 Only authorized users can use the bot
💰 Reduced betting limits
⏱️ Increased cooldowns
🛡️ Additional protections active\`\`\``
        : `\`\`\`yaml
🌍 Bot available for all users
💰 Normal betting limits
⏱️ Normal cooldowns
✨ Full functionality\`\`\``,
      inline: false
    })
    .setFooter({ text: `🛡️ Changed by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Notify in log channel if configured
  try {
    const logChannel = interaction.guild.channels.cache.get(config?.security?.logChannel);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error sending change notification:', error);
  }
}

async function handleWhitelistAdd(interaction, moneda) {
  const user = interaction.options.getUser('user');
  
  addToWhitelist(user.id);
  
  logSecurityEvent('USER_WHITELISTED', interaction.user.id, {
    targetUser: user.id,
    targetTag: user.tag
  });

  const embed = new EmbedBuilder()
    .setTitle('✅ User Added to Whitelist')
    .setColor(0x00AA00)
    .setDescription(`**${user.tag} now has full access to the bot**`)
    .addFields({
      name: '🎯 Granted Permissions',
      value: `\`\`\`yaml
✅ Access during testing mode
✅ No rate limiting limits
✅ Access to all commands
✅ Bypass temporary restrictions\`\`\``,
      inline: false
    })
    .setThumbnail(user.displayAvatarURL())
    .setFooter({ text: `🛡️ Authorized by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleWhitelistRemove(interaction, moneda) {
  const user = interaction.options.getUser('user');
  
  removeFromWhitelist(user.id);
  
  logSecurityEvent('USER_REMOVED_FROM_WHITELIST', interaction.user.id, {
    targetUser: user.id,
    targetTag: user.tag
  });

  const embed = new EmbedBuilder()
    .setTitle('❌ User Removed from Whitelist')
    .setColor(0xFF4444)
    .setDescription(`**${user.tag} no longer has special access**`)
    .addFields({
      name: '⚠️ Applied Restrictions',
      value: `\`\`\`yaml
🧪 Subject to testing mode if active
⏱️ Normal rate limiting applied
🎭 Requires authorized roles
🛡️ All protections active\`\`\``,
      inline: false
    })
    .setThumbnail(user.displayAvatarURL())
    .setFooter({ text: `🛡️ Removed by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleEmergencyStop(interaction, moneda) {
  const reason = interaction.options.getString('reason');
  
  try {
    // Activate emergency maintenance mode through maintenance system
    const maintenanceSystem = await import('../util/maintenanceSystem.js');
    
    // Activate maintenance with emergency reason
    await maintenanceSystem.default.activateMaintenance(
      interaction.user.id, 
      `🚨 EMERGENCY: ${reason}`, 
      0 // No time limit - manual
    );
    
    // Also mark emergency mode in config
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    if (!config.security) config.security = {};
    config.security.emergencyMode = true;
    config.security.emergencyReason = reason;
    config.security.emergencyActivatedBy = interaction.user.id;
    config.security.emergencyTimestamp = new Date().toISOString();
    
    fs.writeFileSync('./config.yml', yaml.dump(config, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false
    }));
    
    logSecurityEvent('EMERGENCY_STOP', interaction.user.id, {
      reason: reason
    });

    const embed = new EmbedBuilder()
      .setTitle('🚨 EMERGENCY STOP ACTIVATED')
      .setColor(0xFF0000)
      .setDescription('**The bot has been put into emergency mode**')
      .addFields(
        {
          name: '🚫 Bot Status',
          value: `\`\`\`yaml
❌ All commands disabled
❌ Only emergency commands work
❌ Economy frozen
❌ Trading suspended
❌ Forced maintenance activated\`\`\``,
          inline: false
        },
        {
          name: '📝 Reason',
          value: `\`\`\`${reason}\`\`\``,
          inline: false
        },
        {
          name: '🔧 To Reactivate',
          value: `\`\`\`Steps to restore:
1. /maintenance action:Disable Maintenance
2. /security emergency-restore\`\`\``,
          inline: false
        }
      )
      .setFooter({ text: `🚨 Stop executed by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send notification to log channel if it exists
    try {
      const logChannelId = config?.security?.logChannel || config?.maintenance?.notificationChannel;
      if (logChannelId && interaction.guild) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const alertEmbed = new EmbedBuilder()
            .setTitle('🚨 EMERGENCY ALERT')
            .setColor(0xFF0000)
            .setDescription(`**Bot put into emergency mode by ${interaction.user.tag}**`)
            .addFields({
              name: '📝 Reason',
              value: reason,
              inline: false
            })
            .setTimestamp();
          
          await logChannel.send({ embeds: [alertEmbed] });
        }
      }
    } catch (error) {
      console.error('Error sending emergency notification:', error);
    }

    // Log en consola
    console.log(`🚨 EMERGENCY STOP ACTIVATED: ${reason} - By ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error activating emergency stop:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ Emergency Stop Error')
      .setColor(0xFF6600)
      .setDescription('**There was an error activating the emergency stop**')
      .addFields({
        name: '🔧 Manual Alternative',
        value: `\`\`\`Use: /maintenance action:Activate reason:"${reason}"\`\`\``,
        inline: false
      });
    
    await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

async function handleEmergencyRestore(interaction, moneda) {
  try {
    // Deactivate maintenance mode
    const maintenanceSystem = await import('../util/maintenanceSystem.js');
    await maintenanceSystem.default.deactivateMaintenance(interaction.user.id);
    
    // Clean emergency mode from config
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    if (config.security) {
      delete config.security.emergencyMode;
      delete config.security.emergencyReason;
      delete config.security.emergencyActivatedBy;
      delete config.security.emergencyTimestamp;
    }
    
    fs.writeFileSync('./config.yml', yaml.dump(config, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false
    }));
    
    logSecurityEvent('EMERGENCY_RESTORED', interaction.user.id, {
      restoredBy: interaction.user.tag
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ System Restored from Emergency')
      .setColor(0x00AA00)
      .setDescription('**The bot has been restored and is functioning normally**')
      .addFields(
        {
          name: '🟢 Bot Status',
          value: `\`\`\`yaml
✅ All commands enabled
✅ Economy active
✅ Trading working
✅ Maintenance disabled
✅ System normalized\`\`\``,
          inline: false
        },
        {
          name: '👤 Restored by',
          value: `${interaction.user.tag}`,
          inline: true
        },
        {
          name: '⏰ Time',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      )
      .setFooter({ text: '✅ System fully operational' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Notify in log channel
    try {
      const logChannelId = config?.security?.logChannel || config?.maintenance?.notificationChannel;
      if (logChannelId && interaction.guild) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const alertEmbed = new EmbedBuilder()
            .setTitle('✅ System Restored')
            .setColor(0x00AA00)
            .setDescription(`**Bot restored from emergency by ${interaction.user.tag}**`)
            .setTimestamp();
          
          await logChannel.send({ embeds: [alertEmbed] });
        }
      }
    } catch (error) {
      console.error('Error sending restoration notification:', error);
    }

    console.log(`✅ EMERGENCY RESTORED - By ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error restoring from emergency:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ Restoration Error')
      .setColor(0xFF6600)
      .setDescription('**There was an error restoring from emergency**')
      .addFields({
        name: '🔧 Manual Alternative',
        value: `\`\`\`Use: /maintenance action:Disable\`\`\``,
        inline: false
      });
    
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}