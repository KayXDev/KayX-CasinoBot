// ═══════════════════════════════════════════════════════════════
// 🔧 ADMIN CRYPTO SETUP COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import marketEngine from '../util/crypto/marketEngine.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-crypto-setup')
  .setDescription('🔧 [ADMIN] Initialize the crypto system and market engine')
  .setDefaultMemberPermissions('0')
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Acción a realizar')
      .addChoices(
        { name: 'Inicializar Sistema', value: 'init' },
        { name: 'Verificar Precios', value: 'check_prices' },
        { name: 'Resetear Precios', value: 'reset_prices' }
      ));

export async function execute(interaction) {
  const action = interaction.options.getString('action') || 'init';

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
    // Defer la respuesta porque puede tardar un poco
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Manejar diferentes acciones
    if (action === 'check_prices') {
      return await handleCheckPrices(interaction);
    } else if (action === 'reset_prices') {
      return await handleResetPrices(interaction);
    }

    // Acción por defecto: inicializar sistema

    // Paso 1: Ejecutar la migración SQL
    console.log('🔄 Starting crypto database migration...');
    await runCryptoMigration();
    console.log('✅ Database migration completed');
    
    // Paso 2: Esperar un poco para asegurar que las tablas estén listas
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Paso 3: Inicializar el market engine
    console.log('🚀 Initializing market engine...');
    await marketEngine.initialize();
    console.log('✅ Market engine initialized');
    
    // Crear embed de éxito
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🚀 **CRYPTO SYSTEM INITIALIZED**')
      .setDescription('The Casino Metaverse Exchange is now online!')
      .addFields(
        {
          name: '✅ Database Setup',
          value: '```\n• Crypto tables created\n• Initial cryptos inserted\n• Market events configured\n• Indexes optimized\n```',
          inline: true
        },
        {
          name: '🏛️ Market Engine',
          value: '```\n• Price engine started\n• 4 cryptos loaded\n• Volatility system active\n• Auto-updates enabled\n```',
          inline: true
        },
        {
          name: '💰 Available Cryptos',
          value: '```\n👑 CSN - Casino Coin\n🚀 MOON - Moon Coin\n💎 DMD - Diamond Token\n🔥 FIRE - Fire Coin\n```',
          inline: false
        }
      )
      .setFooter({ 
        text: 'Users can now use /crypto market to view the exchange',
        iconURL: interaction.guild?.iconURL() || undefined
      })
      .setTimestamp();

    // Log de la acción
    await logAdminCommand(interaction.user, 'admin-crypto-setup', {
      action: 'Crypto System Initialization',
      result: 'SUCCESS - Market engine started',
      additional: 'Casino Metaverse Exchange is now operational'
    });

    await interaction.editReply({ embeds: [successEmbed] });

    // Enviar notificación adicional sobre el nuevo sistema
    console.log('🚀 Casino Metaverse Exchange initialized successfully!');
    console.log('📊 Market updates will occur every 30 seconds');
    console.log('💎 Users can now trade crypto with /crypto market');

  } catch (error) {
    console.error('Error initializing crypto system:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ **INITIALIZATION FAILED**')
      .setDescription('There was an error setting up the crypto system.')
      .addFields({
        name: 'Error Details',
        value: `\`\`\`${error.message}\`\`\``,
        inline: false
      })
      .setTimestamp();

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}

async function runCryptoMigration(silent = false) {
  const { pool } = await import('../db.js');
  
  try {
    // Leer el archivo de migración SQL
    const migrationSQL = fs.readFileSync('./schemas/crypto_system_migration.sql', 'utf8');
    
    // Limpiar el SQL de comentarios y dividir por statements
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    const statements = cleanSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 10); // Solo statements con contenido real
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    // Ejecutar cada statement individualmente
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          await pool.execute(statement);
        } catch (error) {
          // Ignorar errores específicos de elementos que ya existen
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate entry') ||
              error.code === 'ER_TABLE_EXISTS_ERROR' ||
              error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
            continue;
          }
          
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error(`📝 Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    // Verificar que las tablas se crearon correctamente
    console.log('🔍 Verifying table creation...');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'casino_cryptos'");
    if (tables.length === 0) {
      throw new Error('Failed to create casino_cryptos table');
    }
    
    if (!silent) {
      console.log('✅ All crypto tables created and verified successfully');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw new Error(`Database migration failed: ${error.message}`);
  }
}

// Función para inicializar el market engine
async function initializeMarketEngine() {
  try {
    await marketEngine.initialize();
    console.log('🚀 Market engine initialized successfully');
    return marketEngine; // Retornar el marketEngine para uso en otros módulos
  } catch (error) {
    console.error('❌ Failed to initialize market engine:', error);
    throw error;
  }
}

// Función para verificar precios
async function handleCheckPrices(interaction) {
  try {
    const { pool } = await import('../db.js');
    
    // Obtener precios actuales de la base de datos
    const [cryptos] = await pool.execute(
      'SELECT id, name, symbol, current_price, base_price FROM casino_cryptos'
    );

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🔧 Estado Actual de Precios en Base de Datos')
      .setTimestamp();

    let description = '**Precios Actuales vs Configuración:**\n\n';
    const cryptoConfig = config.crypto?.cryptocurrencies || {};

    for (const crypto of cryptos) {
      const configPrice = cryptoConfig[crypto.symbol]?.basePrice || 'No configurado';
      
      description += `**${crypto.name} (${crypto.symbol})**\n`;
      description += `• DB Actual: $${crypto.current_price?.toLocaleString() || 'NULL'}\n`;
      description += `• DB Base: $${crypto.base_price?.toLocaleString() || 'NULL'}\n`;
      description += `• Config.yml: $${typeof configPrice === 'number' ? configPrice.toLocaleString() : configPrice}\n\n`;
    }

    embed.setDescription(description);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error checking prices:', error);
    await interaction.editReply({
      content: '❌ Error al verificar precios: ' + error.message
    });
  }
}

// Función para resetear precios
async function handleResetPrices(interaction) {
  try {
    const { pool } = await import('../db.js');
    const cryptoConfig = config.crypto?.cryptocurrencies || {};
    
    let updatedCount = 0;
    let description = '**Precios Actualizados:**\n\n';

    for (const [symbol, cryptoData] of Object.entries(cryptoConfig)) {
      if (cryptoData.basePrice) {
        // Actualizar precio en la base de datos
        const [result] = await pool.execute(
          'UPDATE casino_cryptos SET current_price = ?, base_price = ? WHERE symbol = ?',
          [cryptoData.basePrice, cryptoData.basePrice, symbol]
        );

        if (result.affectedRows > 0) {
          updatedCount++;
          description += `✅ **${cryptoData.name} (${symbol})**: $${cryptoData.basePrice.toLocaleString()}\n`;
        }
      }
    }

    // Reinicializar el market engine
    await marketEngine.loadCryptoData();

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔧 Precios Reseteados Exitosamente')
      .setDescription(description + `\n**Total actualizado:** ${updatedCount} criptomonedas`)
      .addFields({
        name: '🔄 Estado del Sistema',
        value: 'Market Engine reinicializado con nuevos precios',
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error resetting prices:', error);
    await interaction.editReply({
      content: '❌ Error al resetear precios: ' + error.message
    });
  }
}

// Exportar las funciones para uso externo
export { runCryptoMigration, initializeMarketEngine };