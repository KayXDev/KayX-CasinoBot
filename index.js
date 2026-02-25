import { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType, MessageFlags, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { ensureUsersTable, ensureUserAchievementsTable, ensureCryptoAlertsTables, ensureMaintenanceTable, ensureUserEffectsTable, ensureBotLogsTable, ensureHeistTables, ensureCryptoTradingCooldownsTable, getDatabaseTableCount, ensureBotStatusTables, getActiveStatuses, getStatusConfig } from './db.js';
import { ensureLoteriaV2Tables } from './util/database/loteriaDb.js';
import { ensureShopCooldownsTable } from './util/database/shopDb.js';
import { initLogging } from './util/selectiveLogging.js';
import maintenanceSystem from './util/maintenanceSystem.js';
import Logger from './util/logger.js';
import { 
  isUserAuthorized, 
  isCommandAllowed, 
  createSecurityErrorEmbed,
  logSecurityEvent,
  SECURITY_CONFIG 
} from './util/securitySystem.js';
import { trackCommandExecution, trackSecurityEvent } from './util/monitoringSystem.js';
import { 
  initializeGlobalErrorHandlers, 
  safeCommandWrapper, 
  safeInteractionWrapper,
  getErrorStats,
  notifyBotStartup 
} from './util/globalErrorHandler.js';



// Función para verificar restricciones de canal
function checkChannelRestriction(commandName, channelId) {
  if (!config.channelRestrictions?.enabled) {
    return { allowed: true };
  }
  
  const restrictedCommands = config.channelRestrictions?.restrictedCommands || {};
  const requiredChannel = restrictedCommands[commandName];
  
  if (!requiredChannel) {
    // Comando no restringido, puede usarse en cualquier canal
    return { allowed: true };
  }
  
  if (channelId !== requiredChannel) {
    return {
      allowed: false,
      requiredChannel: requiredChannel
    };
  }
  
  return { allowed: true };
}


// Utilidades para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar configuración desde config.yml
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Hacer el cliente disponible globalmente para el sistema de monitoreo
global.discordClient = client;

// Cargar comandos y preparar datos para registro de slash commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsData = [];
for (const file of commandFiles) {
  try {
    const command = await import(`./commands/${file}`);
    if (command.default && command.default.data && command.default.execute) {
      client.commands.set(command.default.data.name, command.default);
      commandsData.push(command.default.data);
      // console.log(`✅ Loaded command: ${command.default.data.name}`);
    } else if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      commandsData.push(command.data);
      // console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.log(`❌ Failed to load command from ${file}: missing data or execute`);
    }
  } catch (error) {
    console.error(`❌ Error loading command ${file}:`, error.message);
  }
}

import os from 'os';

client.once('clientReady', async () => {
  // 🛡️ INICIALIZAR SISTEMA GLOBAL DE CONTROL DE ERRORES
  initializeGlobalErrorHandlers(client);
  
  // Sistema de captura completa - SUPRIMIR TODO hasta mostrar el banner elegante
  const originalLog = console.log;
  let dbComponents = 4; // Tablas principales del casino
  let cryptoComponents = 12; // Las 12 cryptos definidas en config.yml
  let systemComponents = 0;
  let commandCount = 0;
  let initializationDetails = [];
  
  // SUPRIMIR COMPLETAMENTE todos los mensajes hasta el banner final
  console.log = (message, ...args) => {
    if (typeof message === 'string') {
      // Contar sistemas activos
      if (message.includes('🏆') || message.includes('🚀') || message.includes('📰') || 
          message.includes('�️') || message.includes('⚡') || message.includes('�') ||
          message.includes('Sistema de logging') || message.includes('Engine') || 
          message.includes('Manager') || message.includes('Active')) {
        systemComponents++;
      }
      
      // Capturar número de comandos
      if (message.includes('� Registrando') && message.includes('comandos')) {
        const match = message.match(/(\d+) comandos/);
        if (match) commandCount = parseInt(match[1]);
      }
      
      // Suprimir mensajes verbosos de inicialización
      if (message.includes('✅') && (message.includes('table') || message.includes('verified') || message.includes('created')) ||
          message.includes('�') && message.includes('⚡') ||
          message.includes('�') || message.includes('📋') ||
          message.includes('🔄 Comandos cargados') ||
          message.includes('Executing') || message.includes('SELECT') ||
          message.includes('INSERT') || message.includes('UPDATE')) {
        return; // Suprimir estos mensajes
      }
    }
    
    // SUPRIMIR COMPLETAMENTE todos los mensajes de inicialización
    return;
  };

  // Crear tablas si no existen
  await ensureUsersTable();
  await ensureLoteriaV2Tables();
  await ensureShopCooldownsTable();
  
  // Crear tabla de historial de achievements
  await ensureUserAchievementsTable();
  
  // Crear tablas de sistema de alertas y noticias
  await ensureCryptoAlertsTables();
  
  // Crear tabla de efectos de usuario
  await ensureUserEffectsTable();
  
  // Crear tabla de sistema de mantenimiento
  await ensureMaintenanceTable();
  
  // Crear tabla de logs del bot
  await ensureBotLogsTable();
  
  // Crear tablas del sistema de heist
  await ensureHeistTables();
  
  // Crear tabla de cooldowns de trading crypto
  await ensureCryptoTradingCooldownsTable();
  
  // Crear tablas del sistema de status del bot
  await ensureBotStatusTables();
  
  // Crear tablas del sistema de referidos
  try {
    const { migrateReferralSystem } = await import('./scripts/migrate-referrals.js');
    await migrateReferralSystem();
  } catch (error) {
    console.log('⚠️ Referral system migration already completed or error:', error.message);
  }
  
  // Contar tablas reales de la base de datos
  dbComponents = await getDatabaseTableCount();
  
  // Inicializar sistema crypto automáticamente (silencioso)
  try {
    const { runCryptoMigration, initializeMarketEngine } = await import('./commands/admin-crypto-setup.js');
    await runCryptoMigration(true); // Modo silencioso
    const marketEngine = await initializeMarketEngine();
    
    // Inicializar sistema de noticias y alertas
    const newsEngine = (await import('./util/crypto/newsEngine.js')).default;
    const { pool } = await import('./db.js');
    await newsEngine.initialize(client, pool, marketEngine);
    
  } catch (error) {
    console.error('❌ Error al inicializar sistema crypto:', error.message);
  }
  
  // Inicializar sistema de logging selectivo
  initLogging(client);
  
  // 🛠️ Inicializar sistema de mantenimiento
  try {
    await maintenanceSystem.initialize();
    maintenanceSystem.setClient(client);
    console.log('🛠️ Maintenance system initialized');
    if (await maintenanceSystem.isMaintenanceMode()) {
      const remaining = maintenanceSystem.getRemainingTime();
      if (remaining !== null && remaining > 0) {
        console.log(`⚠️ Bot started in MAINTENANCE MODE (${remaining} minutes remaining)`);
      } else {
        console.log('⚠️ Bot started in MAINTENANCE MODE');
      }
    }
  } catch (error) {
    console.error('❌ Error al inicializar sistema de mantenimiento:', error.message);
  }
  
  // Arreglar la tabla de inventario
  const { fixInventoryTable, ensureInventoryTables } = await import('./db.js');
  await fixInventoryTable();
  await ensureInventoryTables();

  // --- Estados personalizados del bot desde base de datos ---
  const activityTypes = {
    PLAYING: ActivityType.Playing,
    STREAMING: ActivityType.Streaming,
    LISTENING: ActivityType.Listening,
    WATCHING: ActivityType.Watching,
    CUSTOM: ActivityType.Custom,
    COMPETING: ActivityType.Competing
  };

  let currentActivity = 0;
  let activityStatuses = [];
  let presenceInterval = null;
  
  // Función para actualizar los status desde la base de datos
  const refreshActivityStatuses = async () => {
    try {
      const activeStatuses = await getActiveStatuses();
      activityStatuses = activeStatuses.map(s => ({
        name: s.text,
        type: activityTypes[s.type?.toUpperCase()] || ActivityType.Custom
      }));
      
      // Reiniciar el índice si es necesario
      if (currentActivity >= activityStatuses.length) {
        currentActivity = 0;
      }
      
      console.log(`🔄 Status refreshed: ${activityStatuses.length} active statuses loaded`);
    } catch (error) {
      console.error('Error refreshing activity statuses:', error);
      // Fallback a los status del config.yml si hay error
      activityStatuses = (config.activity_statuses || []).map(s => ({
        name: s.text,
        type: activityTypes[s.type?.toUpperCase()] || ActivityType.Custom
      }));
    }
  };

  // Función para actualizar la presencia
  const updatePresence = async () => {
    if (!client.user || activityStatuses.length === 0) return;
    
    try {
      await client.user.setPresence({
        activities: [activityStatuses[currentActivity]],
        status: 'online',
      });
      currentActivity = (currentActivity + 1) % activityStatuses.length;
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Inicializar el sistema de status
  const initializeStatusSystem = async () => {
    try {
      const statusConfig = await getStatusConfig();
      const enabled = statusConfig.enabled === 'true';
      const intervalMs = parseInt(statusConfig.presenceUpdateInterval) || 10000;
      
      if (enabled) {
        await refreshActivityStatuses();
        await updatePresence();
        
        // Configurar rotación de status
        presenceInterval = setInterval(updatePresence, intervalMs);
        
        // Refrescar status desde BD cada 5 minutos por si hay cambios
        setInterval(refreshActivityStatuses, 5 * 60 * 1000);
        
        console.log(`✅ Status system initialized: ${activityStatuses.length} statuses, ${intervalMs}ms interval`);
      } else {
        console.log('ℹ️ Status system disabled in configuration');
      }
    } catch (error) {
      console.error('Error initializing status system:', error);
      // Fallback al sistema anterior
      activityStatuses = (config.activity_statuses || []).map(s => ({
        name: s.text,
        type: activityTypes[s.type?.toUpperCase()] || ActivityType.Custom
      }));
      await updatePresence();
      presenceInterval = setInterval(updatePresence, config.presenceUpdateInterval || 10000);
    }
  };

  // Inicializar el sistema de status
  await initializeStatusSystem();

  // Exportar función de refresh para uso externo (desde comandos)
  global.refreshBotStatus = async () => {
    try {
      await refreshActivityStatuses();
      await updatePresence();
      return { success: true, statusCount: activityStatuses.length };
    } catch (error) {
      console.error('Error in global refresh:', error);
      return { success: false, error: error.message };
    }
  };

  // Registrar slash commands en el servidor de pruebas si guildID está definido
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    // Eliminar comandos globales para evitar duplicados
    await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
    if (config.guildID) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.guildID),
        { body: commandsData }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commandsData }
      );
    }
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
  
  // Restaurar console.log
  console.log = originalLog;
  
  // Capturar información final
  if (!commandCount) commandCount = commandsData.length;

  // Preparar estadísticas
  const version = 'v1.0.0';
  const nodeVersion = process.version;
  const startTime = new Date().toLocaleString();
  const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB';
  const users = client.users.cache.size;
  const channels = client.channels.cache.size;
  const commands = client.commands.size;
  const guilds = client.guilds.cache.size;

  // Banner elegante con toda la información
  console.log(`\n\x1b[36m╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║               999 | CASINO BOT  •  POWERED BY KAYX  ❤️                ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
  
  console.log(`\x1b[36m┌─ SYSTEM INFORMATION ──────────────────────────────────────────┐\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Version    : ${version}`);
  console.log(`\x1b[36m│\x1b[0m  ● Node       : ${nodeVersion}`);
  console.log(`\x1b[36m│\x1b[0m  ● Start Time : ${startTime}`);
  console.log(`\x1b[36m│\x1b[0m  ● Memory     : ${memory}`);
  console.log(`\x1b[36m│\x1b[0m`);
  
  console.log(`\x1b[36m├─ INITIALIZATION STATUS ──────────────────────────────────────┤\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Database   : \x1b[32m✅ ${dbComponents} Tables Ready\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Crypto     : \x1b[32m✅ ${cryptoComponents} Currencies Loaded\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Systems    : \x1b[32m✅ ${systemComponents} Components Active\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Commands   : \x1b[32m✅ ${commandCount} Slash Commands\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m`);
  
  console.log(`\x1b[36m├─ SYSTEM COMPONENTS LOADED ───────────────────────────────────┤\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m`);
  
  // Mostrar detalles de inicialización capturados
  const systemDetails = [
    'Database tables verified & ready',
    'Market engine (BTC, ETH, BNB, SOL, ADA, MATIC, LINK, AVAX, DOT, ATOM, ALGO, XRP)',
    'User achievement tracking system',
    'Technical analysis & trading indicators',  
    'Live crypto market simulation engine',
    'Real-time news & alerts system',
    'Selective logging & monitoring tools',
    'Bot maintenance & administrative panel'
  ];
  
  systemDetails.forEach(detail => {
    console.log(`\x1b[36m│\x1b[0m  \x1b[32m▸\x1b[0m ${detail}`);
  });
  
  console.log(`\x1b[36m│\x1b[0m`);
  
  console.log(`\x1b[36m├─ BOT STATISTICS ──────────────────────────────────────────────┤\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  ● Users      : ${users}`);
  console.log(`\x1b[36m│\x1b[0m  ● Guilds     : ${guilds}`);
  console.log(`\x1b[36m│\x1b[0m  ● Channels   : ${channels}`);
  console.log(`\x1b[36m│\x1b[0m  ● Commands   : ${commands}`);
  console.log(`\x1b[36m│\x1b[0m`);
  
  console.log(`\x1b[36m└─ STATUS: BOT IS NOW ONLINE AND READY! ────────────────────────┘\x1b[0m\n`);
  console.log(`\x1b[90m💡 All ${dbComponents} database tables, ${cryptoComponents} cryptocurrencies, and ${systemComponents} core systems loaded successfully!\x1b[0m\n`);
  
  // Registrar inicio del bot en logs
  await Logger.logSystem('Bot iniciado correctamente', 'info', {
    version: '1.0.0',
    commands: commandCount,
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    database_components: dbComponents,
    crypto_components: cryptoComponents
  });

  // Notificar inicio del bot en Discord
  await notifyBotStartup(client, {
    commands: commandCount,
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    database_components: dbComponents,
    crypto_components: cryptoComponents,
    system_components: systemComponents
  });
  
  // ═══════════════════════════════════════════════════════════════
  // 🎲 SISTEMA AUTOMÁTICO DE LOTERÍA
  // ═══════════════════════════════════════════════════════════════
  
  // Verificar sorteos expirados al iniciar
  const { verificarSorteosExpirados } = await import('./util/database/loteriaDb.js');
  const sorteosEjecutados = await verificarSorteosExpirados();
  if (sorteosEjecutados > 0) {
    console.log(`🎰 ${sorteosEjecutados} sorteos ejecutados automáticamente al iniciar`);
  }
  
  // Verificar cada 5 minutos si hay sorteos que deben ejecutarse
  setInterval(async () => {
    try {
      const ejecutados = await verificarSorteosExpirados();
      if (ejecutados > 0) {
        console.log(`🎰 ${ejecutados} sorteos ejecutados automáticamente`);
      }
    } catch (error) {
      console.error('❌ Error en verificación automática de sorteos:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutos

  // ═══════════════════════════════════════════════════════════════
  // 💾 SISTEMA DE BACKUP AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════
  try {
    const { createServerBackupSilent } = await import('./util/backupSystem.js');
    if (config.backup?.enabled) {
      const intervalMs = (config.backup.intervalMinutes || 360) * 60 * 1000;
      const guild = client.guilds.cache.get(config.guildID);
      if (guild) {
        console.log('🛡️ Admin panel initialized');
        
        // Backup inmediato al arrancar (con un pequeño delay para asegurar que todo esté listo)
        setTimeout(async () => {
          try {
            await createServerBackupSilent(guild);
            console.log('💾 Initial automatic backup completed successfully');
          } catch (error) {
            console.error('❌ Error in initial backup:', error.message);
          }
        }, 5000); // 5 segundos de delay
        
        // Backup periódico
        setInterval(async () => {
          try {
            await createServerBackupSilent(guild);
            console.log('💾 Scheduled automatic backup completed');
          } catch (error) {
            console.error('❌ Error in scheduled backup:', error.message);
          }
        }, intervalMs);
        
        console.log(`💾 Automatic backup system initialized (interval: ${config.backup.intervalMinutes} minutes)`);
      } else {
        console.warn('⚠️ Server not found for automatic backups. Check guildID in config.yml');
      }
    } else {
      console.log('💾 Automatic backup system is disabled in configuration');
    }
  } catch (error) {
    console.error('❌ Error initializing automatic backup system:', error.message);
  }
  
  // Iniciar recordatorio bump
  // iniciarRecordatorioBump(client);


});

client.on('interactionCreate', async interaction => {
  // Slash command
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    // 🛠️ VERIFICAR MODO MANTENIMIENTO
    const maintenanceCheck = await maintenanceSystem.canExecuteCommand(
      interaction.commandName, 
      interaction.user.id
    );
    
    if (!maintenanceCheck.allowed) {
      return await interaction.reply({ 
        embeds: [maintenanceCheck.embed], 
        flags: MessageFlags.Ephemeral 
      });
    }
    
    // 🔒 VERIFICAR RESTRICCIONES DE CANAL
    const channelCheck = checkChannelRestriction(interaction.commandName, interaction.channelId);
    if (!channelCheck.allowed) {
      const channelEmbed = new EmbedBuilder()
        .setTitle('🚫 Canal Incorrecto')
        .setDescription(`**Este comando solo puede usarse en el canal designado.**\n\n💡 *Usa <#${channelCheck.requiredChannel}> para este comando.*`)
        .setColor(0xff6b6b)
        .addFields({
          name: '📍 Comando',
          value: `\`/${interaction.commandName}\``,
          inline: true
        }, {
          name: '🎯 Canal Correcto',
          value: `<#${channelCheck.requiredChannel}>`,
          inline: true
        })
        .setFooter({ 
          text: 'Sistema de Restricciones • Mantén el orden en el casino',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      return await interaction.reply({ 
        embeds: [channelEmbed], 
        flags: MessageFlags.Ephemeral 
      });
    }

    // 🛡️ VERIFICAR SISTEMA DE SEGURIDAD 
    const authCheck = isUserAuthorized(interaction);
    if (!authCheck.authorized) {
      trackSecurityEvent('UNAUTHORIZED_ACCESS', interaction.user.id, 'medium');
      logSecurityEvent('UNAUTHORIZED_ACCESS', interaction.user.id, {
        command: interaction.commandName,
        reason: authCheck.reason,
        channel: interaction.channelId
      });
      
      const securityEmbed = createSecurityErrorEmbed(authCheck.reason, true);
      return await interaction.reply({ 
        embeds: [securityEmbed], 
        flags: MessageFlags.Ephemeral
      });
    }

    // 🛡️ VERIFICAR SI EL COMANDO ESTÁ PERMITIDO
    const commandCheck = isCommandAllowed(interaction.commandName, interaction);
    if (!commandCheck.allowed) {
      trackSecurityEvent('BLOCKED_COMMAND', interaction.user.id, 'medium');
      logSecurityEvent('BLOCKED_COMMAND', interaction.user.id, {
        command: interaction.commandName,
        reason: commandCheck.reason
      });
      
      const commandEmbed = createSecurityErrorEmbed(commandCheck.reason);
      return await interaction.reply({ 
        embeds: [commandEmbed], 
        flags: MessageFlags.Ephemeral
      });
    }
    
    // 🛡️ EJECUTAR COMANDO CON PROTECCIÓN GLOBAL DE ERRORES
    const safeExecute = safeCommandWrapper(command.execute, interaction.commandName);
    
    try {
      // Ejecutar comando con timeout de seguridad y protección de errores
      const commandPromise = safeExecute(interaction, config);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Command timeout after 30 seconds')), 30000)
      );
      
      const result = await Promise.race([commandPromise, timeoutPromise]);
      
      // Solo registrar como exitoso si el comando realmente fue exitoso
      if (result !== false) {
        // 📊 REGISTRAR COMANDO EXITOSO
        trackCommandExecution(interaction.user.id, interaction.commandName, {
          channel: interaction.channelId,
          success: true
        });
        logSecurityEvent('COMMAND_EXECUTED', interaction.user.id, {
          command: interaction.commandName,
          channel: interaction.channelId,
          success: true
        });
        
        // Registrar comando exitoso en logs
        await Logger.logCommand(interaction, interaction.commandName, true);
      }
      
    } catch (error) {
      // 🚨 ERROR CAPTURADO POR EL SISTEMA GLOBAL
      // El error ya fue manejado por safeCommandWrapper, solo loggeamos aquí
      console.error(`🚨 Error en comando ${interaction.commandName}:`, error);
      
      // Registrar error en logs
      try {
        await Logger.logCommand(interaction, interaction.commandName, false, null, error);
      } catch (logError) {
        console.error('Error logging command error:', logError);
      }
      
      // Respuesta de emergencia si el wrapper no pudo responder
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: '⚠️ Error interno del sistema. El error ha sido registrado automáticamente.', 
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        // Error crítico - no podemos responder, pero el bot continúa funcionando
        console.error('Error crítico respondiendo a interacción:', replyError);
      }
    }
    return;
  }
  // Button interactions can be added here for other commands
  if (interaction.isButton()) {
    // Handle scratch game buttons
    if (interaction.customId.startsWith('scratch_')) {
      const rasca = client.commands.get('rasca');
      if (rasca && rasca.handleScratchButton) {
        try {
          await rasca.handleScratchButton(interaction, config);
        } catch (error) {
          try {
            await interaction.reply({ 
              content: '❌ An error occurred while processing your scratch game.', 
              flags: MessageFlags.Ephemeral
            });
          } catch (replyError) {
            // Si no se puede responder, no hacer nada
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 HANDLE CRYPTO MARKET REFRESH BUTTON
    // ═══════════════════════════════════════════════════════════════
    if (interaction.customId === 'crypto_refresh') {
      try {
        const marketEngine = (await import('./util/crypto/marketEngine.js')).default;
        
        // Obtener datos actualizados del mercado
        const marketData = marketEngine.getMarketData();
        
        if (!marketData.cryptos || marketData.cryptos.length === 0) {
          return await interaction.reply({
            content: '❌ Market data is currently unavailable. Please try again later.',
            flags: MessageFlags.Ephemeral
          });
        }

        // Importar funciones necesarias
        const cryptoMarketModule = await import('./commands/crypto-market.js');
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        
        if (cryptoMarketModule.createMarketEmbed) {
          const marketEmbed = cryptoMarketModule.createMarketEmbed(marketData);
          
          // Crear botón de refresh
          const buttons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('crypto_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚡')
            );
          
          await interaction.update({ 
            embeds: [marketEmbed],
            components: [buttons]
          });
        } else {
          await interaction.reply({
            content: '❌ Error refreshing market data.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (error) {
        console.error('Error refreshing crypto market:', error);
        try {
          // Verificar si la interacción ya fue respondida o expiró
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '❌ Error al actualizar el mercado.',
              flags: MessageFlags.Ephemeral
            });
          } else {
            // Si ya fue respondida, intentar editar
            await interaction.editReply({
              content: '❌ Error al actualizar el mercado.'
            });
          }
        } catch (replyError) {
          // Si todos los intentos fallan, solo logear el error
          console.error('Could not reply to interaction:', replyError);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎫 HANDLE LOTTERY ADMIN INTERACTIONS
    // ═══════════════════════════════════════════════════════════════
    if (interaction.customId.startsWith('confirmar_sorteo_')) {
      const { ejecutarSorteo } = await import('./util/database/loteriaDb.js');
      const { EmbedBuilder } = await import('discord.js');
      
      const tipoSorteo = interaction.customId.replace('confirmar_sorteo_', '');
      
      try {
        // Verificar que el usuario sea administrador
        const esAdmin = interaction.member?.permissions.has('Administrator') || 
                       interaction.user.id === '506400740499398697';
        
        if (!esAdmin) {
          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Acceso Denegado')
                .setDescription('No tienes permisos para ejecutar sorteos.')
                .setColor(0xe74c3c)
            ],
            components: []
          });
        }

        // Ejecutar sorteo
        const resultado = await ejecutarSorteo(tipoSorteo);
        const moneda = config.casino?.moneda || '💰';
        const tipoEmojis = { diaria: '🌅', semanal: '📅', mensual: '🗓️' };
        
        // Crear embed de resultado
        const embed = new EmbedBuilder()
          .setTitle(`${tipoEmojis[tipoSorteo]} Sorteo Ejecutado - ${tipoSorteo.charAt(0).toUpperCase() + tipoSorteo.slice(1)}`)
          .setDescription(`**¡El sorteo ha sido ejecutado exitosamente!**\n\n🎲 **Números ganadores:** ${resultado.numerosGanadores.join(' - ')}`)
          .setColor(0x2ecc71)
          .addFields(
            {
              name: '🏆 Información del Sorteo',
              value: `💰 **Pozo total:** ${resultado.pozoTotal.toLocaleString()} ${moneda}\n🎫 **Boletos participantes:** ${resultado.totalBoletos}\n💸 **Premios distribuidos:** ${resultado.premiosDistribuidos.toLocaleString()} ${moneda}`,
              inline: false
            }
          );

        // Agregar información de ganadores
        let ganadoresTexto = '';
        if (resultado.ganadores[6].length > 0) {
          ganadoresTexto += `🥇 **6 aciertos (${resultado.ganadores[6].length}):** `;
          ganadoresTexto += resultado.ganadores[6].map(g => `<@${g.userId}>`).join(', ') + '\n';
        }
        if (resultado.ganadores[5].length > 0) {
          ganadoresTexto += `🥈 **5 aciertos (${resultado.ganadores[5].length}):** `;
          ganadoresTexto += resultado.ganadores[5].map(g => `<@${g.userId}>`).join(', ') + '\n';
        }
        if (resultado.ganadores[4].length > 0) {
          ganadoresTexto += `🥉 **4 aciertos (${resultado.ganadores[4].length}):** `;
          ganadoresTexto += resultado.ganadores[4].map(g => `<@${g.userId}>`).join(', ');
        }

        if (ganadoresTexto) {
          embed.addFields({
            name: '👑 Ganadores',
            value: ganadoresTexto,
            inline: false
          });
        } else {
          embed.addFields({
            name: '😔 Sin Ganadores',
            value: 'No hubo ganadores con 4 o más aciertos en este sorteo.',
            inline: false
          });
        }

        embed.setFooter({ 
          text: `Ejecutado por: ${interaction.user.tag} • ID: ${resultado.sorteoId}`,
          iconURL: interaction.user.displayAvatarURL() 
        }).setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

      } catch (error) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Error al Ejecutar Sorteo')
              .setDescription(`Error: ${error.message}`)
              .setColor(0xe74c3c)
          ],
          components: []
        });
      }
    }

    if (interaction.customId === 'cancelar_sorteo') {
      const { EmbedBuilder } = await import('discord.js');
      
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Sorteo Cancelado')
            .setDescription('La ejecución del sorteo ha sido cancelada.')
            .setColor(0x95a5a6)
        ],
        components: []
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // � HANDLE FRIENDS MENU INTERACTIONS
    // ═══════════════════════════════════════════════════════════════
    /*
    // FRIENDS MENU INTERACTIONS - HANDLED BY COMMAND COLLECTOR
    if (interaction.isStringSelectMenu() && interaction.customId === 'friends_menu') {
      return; // Let the command collector handle this
    }
    */

    // ═══════════════════════════════════════════════════════════════
    // �🔙 HANDLE BACK TO FRIENDS MENU BUTTON
    // ═══════════════════════════════════════════════════════════════
    // Back to friends menu button - handled by friends.js collector
    if (interaction.customId === 'back_to_friends_menu') {
      return; // Let the friends.js collector handle this
    }

    // ═══════════════════════════════════════════════════════════════
    // 🤝 HANDLE FRIEND REQUEST BUTTONS
    // ═══════════════════════════════════════════════════════════════
    if (interaction.customId.startsWith('accept_friend_') || interaction.customId.startsWith('reject_friend_')) {
      const { acceptFriendRequest, rejectFriendRequest } = await import('./util/database/friendsDb.js');
      const { EmbedBuilder } = await import('discord.js');
      
      const parts = interaction.customId.split('_');
      const action = parts[0]; // 'accept' o 'reject'
      const senderId = parts[2]; // ID del usuario que envió la solicitud
      const receiverId = parts[3]; // ID del usuario que debe recibir/responder
      const userId = interaction.user.id; // ID del usuario que está intentando usar el botón
      
      // 🛡️ VALIDAR QUE SOLO EL DESTINATARIO PUEDA USAR LOS BOTONES
      if (userId !== receiverId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🚫 Acceso Denegado')
              .setColor(0xe74c3c)
              .setDescription('**No puedes responder a esta solicitud de amistad**\n\n⚠️ *Solo el destinatario puede usar estos botones*')
              .addFields([
                {
                  name: '💡 Información',
                  value: 'Esta solicitud no está dirigida a ti. Solo el usuario mencionado puede aceptar o rechazar.',
                  inline: false
                }
              ])
              .setFooter({ text: 'Casino Bot • Botones de uso exclusivo' })
          ],
          flags: MessageFlags.Ephemeral
        });
      }
      
      try {
        if (action === 'accept') {
          // Aceptar la solicitud
          const result = await acceptFriendRequest(userId, senderId);
          
          if (result.success) {
            // Obtener información del usuario que envió la solicitud
            const requester = await client.users.fetch(senderId);
            
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('✅ ¡Solicitud Aceptada!')
                  .setColor(0x1abc9c)
                  .setDescription(`**¡Ahora eres amigo de ${requester.username}!**\n\n🎉 *¡Bienvenido a tu nueva amistad!*`)
                  .setThumbnail(requester.displayAvatarURL())
                  .addFields([
                    {
                      name: '🤝 Nueva Amistad Confirmada',
                      value: `**Amigo:** ${requester.username}\n**Fecha:** ${new Date().toLocaleString('es-ES')}\n**Estado:** ¡Conectados!`,
                      inline: false
                    },
                    {
                      name: '🎮 ¡Ahora pueden!',
                      value: '```🏆 Competir juntos\n🎲 Jugar en equipo\n💰 Compartir logros\n📊 Ver estadísticas```',
                      inline: false
                    }
                  ])
                  .setFooter({ 
                    text: 'Casino Bot • ¡Disfruten su amistad!',
                    iconURL: client.user.displayAvatarURL()
                  })
                  .setTimestamp()
              ],
              components: [] // Remover botones
            });

            // Notificar al usuario que envió la solicitud
            try {
              await requester.send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('🎉 ¡Tu solicitud fue aceptada!')
                    .setColor(0x1abc9c)
                    .setDescription(`**${interaction.user.username} aceptó tu solicitud de amistad!**\n\n🤝 *¡Ya son amigos oficiales!*`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields([
                      {
                        name: '✨ ¡Felicidades!',
                        value: `Ahora puedes interactuar más con **${interaction.user.username}** en el casino`,
                        inline: false
                      }
                    ])
                    .setFooter({ text: 'Casino Bot • ¡Nueva amistad!' })
                    .setTimestamp()
                ]
              });
            } catch (dmError) {
              console.log(`No se pudo enviar DM a ${requester.username}`);
            }
            
          } else {
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('❌ Error')
                  .setColor(0xe74c3c)
                  .setDescription(`**Error:** ${result.message}`)
                  .setFooter({ text: 'Casino Bot' })
              ],
              components: []
            });
          }
          
        } else {
          // Rechazar la solicitud
          const result = await rejectFriendRequest(userId, senderId);
          
          if (result.success) {
            const requester = await client.users.fetch(senderId);
            
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('❌ Solicitud Rechazada')
                  .setColor(0x95a5a6)
                  .setDescription(`**Solicitud de ${requester.username} rechazada**\n\n💭 *Decisión respetada*`)
                  .setThumbnail(requester.displayAvatarURL())
                  .addFields([
                    {
                      name: '📝 Acción Completada',
                      value: `La solicitud de **${requester.username}** ha sido rechazada exitosamente.`,
                      inline: false
                    }
                  ])
                  .setFooter({ text: 'Casino Bot • Decisión registrada' })
                  .setTimestamp()
              ],
              components: []
            });
          } else {
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('❌ Error')
                  .setColor(0xe74c3c)
                  .setDescription(`**Error:** ${result.message}`)
                  .setFooter({ text: 'Casino Bot' })
              ],
              components: []
            });
          }
        }
        
      } catch (error) {
        try {
          await interaction.reply({ 
            content: '❌ Ocurrió un error al procesar la solicitud de amistad.', 
            flags: MessageFlags.Ephemeral
          });
        } catch (replyError) {
          // Si no se puede responder, no hacer nada
        }
      }
    }
    
    return;
  }
});

// ═══════════════════════════════════════════════════════════════
// 🛠️ FUNCIONES GLOBALES PARA FRIENDS MENU
// ═══════════════════════════════════════════════════════════════

async function handleGlobalViewFriends(interaction) {
  const { getUserFriends } = await import('./util/database/friendsDb.js');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  const userId = interaction.user.id;
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

    const backButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('back_to_friends_menu')
          .setLabel('🔙 Volver al Menú')
          .setStyle(ButtonStyle.Secondary)
      );

    return interaction.update({ 
      embeds: [noFriendsEmbed], 
      components: [backButton]
    });
  }

  const friendsList = userFriends.slice(0, 10).map((friend, index) => {
    const friendUser = interaction.guild?.members.cache.get(friend.friend_id);
    const friendName = friendUser ? friendUser.displayName : `Usuario ${friend.friend_id}`;
    const friendDate = new Date(friend.accepted_at).toLocaleDateString('es-ES');
    return `**${index + 1}.** ${friendName}\n   └ *Amigos desde: ${friendDate}*`;
  }).join('\n\n');

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

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_friends_menu')
        .setLabel('🔙 Volver al Menú')
        .setStyle(ButtonStyle.Secondary)
    );

  return interaction.update({ 
    embeds: [friendsEmbed], 
    components: [backButton]
  });
}

async function handleGlobalPendingRequests(interaction) {
  const { getPendingRequests } = await import('./util/database/friendsDb.js');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  const userId = interaction.user.id;
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

    const backButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('back_to_friends_menu')
          .setLabel('🔙 Volver al Menú')
          .setStyle(ButtonStyle.Secondary)
      );

    return interaction.update({ 
      embeds: [noPendingEmbed], 
      components: [backButton]
    });
  }

  // Por ahora, funcionalidad básica - se puede expandir después
  return interaction.update({
    content: '📥 Tienes solicitudes pendientes. Usa la funcionalidad completa del comando original para gestionarlas.',
    embeds: [],
    components: []
  });
}

async function handleGlobalSentRequests(interaction) {
  const { getSentRequests } = await import('./util/database/friendsDb.js');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  const userId = interaction.user.id;
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

    const backButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('back_to_friends_menu')
          .setLabel('🔙 Volver al Menú')
          .setStyle(ButtonStyle.Secondary)
      );

    return interaction.update({ 
      embeds: [noSentEmbed], 
      components: [backButton]
    });
  }

  const sentList = sentRequests.slice(0, 10).map((request, index) => {
    const targetUser = interaction.guild?.members.cache.get(request.friend_id);
    const targetName = targetUser ? targetUser.displayName : `Usuario ${request.friend_id}`;
    const sentDate = new Date(request.created_at).toLocaleDateString('es-ES');
    return `**${index + 1}.** ${targetName}\n   └ *Enviada: ${sentDate}*`;
  }).join('\n\n');

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

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_friends_menu')
        .setLabel('🔙 Volver al Menú')
        .setStyle(ButtonStyle.Secondary)
    );

  return interaction.update({ 
    embeds: [sentEmbed], 
    components: [backButton]
  });
}

client.login(config.token);
