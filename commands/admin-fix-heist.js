import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { ensureHeistTables, ensureCryptoTradingCooldownsTable, pool } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('admin-fix-heist')
  .setDescription('[ADMIN] Fix missing heist and crypto tables')
  .setDefaultMemberPermissions('0'); // Solo administradores

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

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setTitle('🏴‍☠️ Missing Tables Creation')
      .setDescription('Creating missing heist and crypto system tables...')
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Verificar cuáles tablas existen actualmente
    const [existingHeistTables] = await pool.query("SHOW TABLES LIKE '%heist%'");
    const [existingCryptoTables] = await pool.query("SHOW TABLES LIKE '%crypto_trading_cooldowns%'");
    const heistTables = existingHeistTables.map(t => Object.values(t)[0]);
    const cryptoTables = existingCryptoTables.map(t => Object.values(t)[0]);

    embed.addFields({
      name: '📊 Current Status',
      value: `Heist tables: ${heistTables.length > 0 ? heistTables.join(', ') : 'None'}\nCrypto cooldowns: ${cryptoTables.length > 0 ? cryptoTables.join(', ') : 'None'}`,
      inline: false
    });

    // Crear las tablas de heist
    await ensureHeistTables();
    
    // Crear tabla de cooldowns crypto
    await ensureCryptoTradingCooldownsTable();

    // Verificar nuevamente después de la creación
    const [newHeistTables] = await pool.query("SHOW TABLES LIKE '%heist%'");
    const [newCryptoTables] = await pool.query("SHOW TABLES LIKE '%crypto_trading_cooldowns%'");
    const heistTablesAfter = newHeistTables.map(t => Object.values(t)[0]);
    const cryptoTablesAfter = newCryptoTables.map(t => Object.values(t)[0]);

    // Contar todas las tablas
    const [allTables] = await pool.query('SHOW TABLES');
    const totalTables = allTables.length;

    embed.setTitle('✅ Missing Tables Creation Complete')
      .setDescription('All missing system tables have been successfully created!')
      .setColor(0x27ae60);

    embed.addFields({
      name: '🎯 Results',
      value: `**Heist tables:** ${heistTablesAfter.length > 0 ? heistTablesAfter.join(', ') : 'None'}\n**Crypto tables:** ${cryptoTablesAfter.length > 0 ? cryptoTablesAfter.join(', ') : 'None'}\n**Total database tables:** ${totalTables}`,
      inline: false
    });

    if (heistTablesAfter.length >= 3 && cryptoTablesAfter.length >= 1) {
      embed.addFields({
        name: '✨ Success!',
        value: '**All required tables are now available:**\n\n**Heist System (3 tables):**\n• `user_heist_equipment` - Equipment items\n• `user_heist_consumables` - Consumable items\n• `heist_item_usage` - Usage history\n\n**Crypto System (1 table):**\n• `crypto_trading_cooldowns` - Trading cooldowns',
        inline: false
      });
    }

    embed.setFooter({ 
      text: 'Database Fix • All missing tables created successfully',
      iconURL: interaction.user.displayAvatarURL()
    });

    await interaction.editReply({ embeds: [embed] });

    // Log admin command
    await logAdminCommand(interaction.user, 'admin-fix-heist', {
      tables_created: ['heist_items', 'heist_items_shop', 'crypto_trading_cooldowns'],
      action: 'database_fix'
    });

  } catch (error) {
    console.error('Error in admin-fix-heist:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error Creating Missing Tables')
      .setDescription(`An error occurred while creating missing tables:\n\`\`\`${error.message}\`\`\``)
      .setColor(0xe74c3c)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}