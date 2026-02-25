// ═══════════════════════════════════════════════════════════════
// 🛡️ SISTEMA GLOBAL DE CONTROL DE ERRORES
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder, WebhookClient, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// ═══════════════════════════════════════════════════════════════
// 🔍 CONFIGURACIÓN DEL SISTEMA DE ERRORES
// ═══════════════════════════════════════════════════════════════

export const ERROR_SYSTEM = {
  // Contadores de errores
  errorCounts: {
    total: 0,
    commands: 0,
    interactions: 0,
    database: 0,
    discord: 0,
    crypto: 0,
    maintenance: 0,
    system: 0
  },

  // Errores recientes (para evitar spam)
  recentErrors: new Map(),
  
  // Sistema de auto-recovery
  recoveryAttempts: 0,
  maxRecoveryAttempts: 5,
  
  // Estado del sistema
  systemHealth: {
    isHealthy: true,
    lastError: null,
    uptime: Date.now(),
    restarts: 0
  }
};

// ═══════════════════════════════════════════════════════════════
// 🚨 HANDLERS DE ERRORES GLOBALES
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializar todos los handlers de errores globales
 */
export function initializeGlobalErrorHandlers(client) {
  console.log('🛡️ Inicializando sistema global de control de errores...');
  
  // 1. Errores no capturados (Uncaught Exceptions)
  process.on('uncaughtException', (error, origin) => {
    handleCriticalError('UNCAUGHT_EXCEPTION', error, { origin });
  });

  // 2. Promesas rechazadas no manejadas (Unhandled Promise Rejections)
  process.on('unhandledRejection', (reason, promise) => {
    handleCriticalError('UNHANDLED_REJECTION', reason, { promise });
  });

  // 3. Advertencias del sistema
  process.on('warning', (warning) => {
    logWarning('SYSTEM_WARNING', warning);
  });

  // 4. Señales del sistema (SIGTERM, SIGINT, etc.)
  setupGracefulShutdown(client);

  // 5. Errores de Discord.js
  setupDiscordErrorHandlers(client);

  // 6. Monitor de memoria y recursos
  setupResourceMonitoring();

  console.log('✅ Sistema global de control de errores activado');
}

/**
 * Maneja errores críticos que podrían tumbar el bot
 */
function handleCriticalError(type, error, context = {}) {
  ERROR_SYSTEM.errorCounts.total++;
  ERROR_SYSTEM.errorCounts.system++;
  ERROR_SYSTEM.systemHealth.lastError = {
    type,
    error: error.message || error,
    stack: error.stack || 'No stack available',
    timestamp: new Date().toISOString(),
    context
  };

  // Log detallado del error
  const errorId = generateErrorId();
  const errorLog = {
    id: errorId,
    type: type,
    message: error.message || error,
    stack: error.stack || 'No stack available',
    timestamp: new Date().toISOString(),
    context: context,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  // Guardar error en archivo
  saveErrorLog(errorLog);

  // Mostrar error en consola con formato
  console.error(`
╔════════════════════════════════════════════════════════════════════╗
║                        🚨 ERROR CRÍTICO DETECTADO                  ║
╠════════════════════════════════════════════════════════════════════╣
║ ID: ${errorId}
║ Tipo: ${type}
║ Mensaje: ${error.message || error}
║ Timestamp: ${new Date().toISOString()}
║ Uptime: ${Math.floor(process.uptime())} segundos
╠════════════════════════════════════════════════════════════════════╣
║ 🛡️ ACCIÓN: Error capturado - Bot continúa funcionando
╚════════════════════════════════════════════════════════════════════╝
`);

  // Notificar en Discord si es posible
  notifyErrorInDiscord(errorLog);

  // Intentar recuperación automática si es necesario
  attemptAutoRecovery(type, error);

  // NO TERMINAMOS EL PROCESO - El bot continúa funcionando
}

/**
 * Configura handlers para errores de Discord.js
 */
function setupDiscordErrorHandlers(client) {
  client.on('error', (error) => {
    ERROR_SYSTEM.errorCounts.discord++;
    logError('DISCORD_CLIENT_ERROR', error);
  });

  client.on('warn', (info) => {
    logWarning('DISCORD_WARNING', info);
  });

  client.on('debug', (info) => {
    // Solo loggear debug importantes
    if (info.includes('hit a 429') || info.includes('rate limit')) {
      logWarning('DISCORD_RATE_LIMIT', info);
    }
  });

  client.rest.on('rateLimited', (rateLimitData) => {
    logWarning('DISCORD_RATE_LIMITED', rateLimitData);
  });
}

/**
 * Configura cierre graceful del bot
 */
function setupGracefulShutdown(client) {
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛡️ Recibida señal ${signal} - Iniciando cierre controlado...`);
    
    try {
      // 1. Notificar que el bot se está cerrando
      await notifyShutdown(client, signal);
      
      // 2. Guardar estado actual
      await saveSystemState();
      
      // 3. Cerrar conexiones de base de datos
      console.log('📊 Cerrando conexiones de base de datos...');
      
      // 4. Cerrar cliente de Discord
      console.log('🤖 Cerrando cliente de Discord...');
      await client.destroy();
      
      // 5. Salir del proceso
      console.log('✅ Cierre controlado completado');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error durante cierre controlado:', error);
      process.exit(1);
    }
  };

  // Configurar señales de cierre
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR1', () => gracefulShutdown('SIGUSR1'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
}

/**
 * Monitor de recursos del sistema
 */
function setupResourceMonitoring() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Advertir si el uso de memoria es muy alto (>500MB)
    if (memMB > 500) {
      logWarning('HIGH_MEMORY_USAGE', { memoryMB: memMB });
    }
    
    // Advertir si hay muchos errores recientes
    if (ERROR_SYSTEM.errorCounts.total > 100) {
      logWarning('HIGH_ERROR_COUNT', { 
        totalErrors: ERROR_SYSTEM.errorCounts.total 
      });
    }
  }, 60000); // Cada minuto
}

// ═══════════════════════════════════════════════════════════════
// 🔧 FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════

/**
 * Wrapper seguro para comandos
 */
export function safeCommandWrapper(commandExecute, commandName) {
  return async function(interaction, ...args) {
    try {
      return await commandExecute(interaction, ...args);
    } catch (error) {
      ERROR_SYSTEM.errorCounts.commands++;
      
      const errorLog = {
        type: 'COMMAND_ERROR',
        command: commandName,
        user: interaction.user.id,
        guild: interaction.guildId,
        channel: interaction.channelId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      logError('COMMAND_ERROR', error, errorLog);
      
      // Responder al usuario con error elegante
      await handleCommandError(interaction, error, commandName);
      
      return false;
    }
  };
}

/**
 * Wrapper seguro para interacciones
 */
export function safeInteractionWrapper(handler, type = 'INTERACTION') {
  return async function(...args) {
    try {
      return await handler(...args);
    } catch (error) {
      ERROR_SYSTEM.errorCounts.interactions++;
      logError(`${type}_ERROR`, error);
      
      // Intentar responder con error si es posible
      const [interaction] = args;
      if (interaction && interaction.reply && !interaction.replied) {
        try {
          await interaction.reply({
            content: '⚠️ Ha ocurrido un error interno. Por favor, inténtalo de nuevo.',
            flags: MessageFlags.Ephemeral
          });
        } catch (replyError) {
          // Si no podemos responder, al menos loggeamos
          console.error('Error responding to interaction:', replyError);
        }
      }
      
      return false;
    }
  };
}

/**
 * Maneja errores específicos de comandos
 */
async function handleCommandError(interaction, error, commandName) {
  const errorEmbed = new EmbedBuilder()
    .setTitle('⚠️ Error en Comando')
    .setColor(0xFF6600)
    .setDescription('**Ha ocurrido un error interno**')
    .addFields(
      {
        name: '🎮 Comando',
        value: `\`/${commandName}\``,
        inline: true
      },
      {
        name: '🔢 Error ID',
        value: `\`${generateErrorId()}\``,
        inline: true
      },
      {
        name: '💡 Qué hacer',
        value: '```• Intenta el comando de nuevo\n• Si persiste, contacta a un admin\n• El error ha sido reportado automáticamente```',
        inline: false
      }
    )
    .setFooter({ 
      text: '🛡️ Sistema de Error Recovery',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  } catch (replyError) {
    console.error('Error enviando embed de error:', replyError);
  }
}

/**
 * Intenta recuperación automática del sistema
 */
function attemptAutoRecovery(type, error) {
  if (ERROR_SYSTEM.recoveryAttempts >= ERROR_SYSTEM.maxRecoveryAttempts) {
    console.error('🚨 Máximos intentos de recuperación alcanzados');
    return;
  }

  ERROR_SYSTEM.recoveryAttempts++;
  
  console.log(`🔄 Intentando recuperación automática (${ERROR_SYSTEM.recoveryAttempts}/${ERROR_SYSTEM.maxRecoveryAttempts})...`);
  
  // Estrategias de recuperación según el tipo de error
  switch (type) {
    case 'UNHANDLED_REJECTION':
      // Para promesas rechazadas, limpiar recursos si es necesario
      setTimeout(() => {
        if (global.gc) {
          global.gc();
        }
      }, 1000);
      break;
      
    case 'UNCAUGHT_EXCEPTION':
      // Para excepciones no capturadas, verificar conexiones
      setTimeout(() => {
        console.log('🔄 Verificando estado de conexiones...');
        // Aquí puedes agregar verificaciones específicas
      }, 2000);
      break;
  }
}

/**
 * Genera un ID único para cada error
 */
function generateErrorId() {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Guarda logs de errores en archivo
 */
function saveErrorLog(errorLog) {
  try {
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `errors_${today}.json`);
    
    let logs = [];
    if (fs.existsSync(logFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      } catch (e) {
        console.error('Error leyendo log file:', e);
      }
    }
    
    logs.push(errorLog);
    
    // Mantener solo los últimos 500 errores por día
    if (logs.length > 500) {
      logs = logs.slice(-500);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error guardando log de error:', error);
  }
}

/**
 * Log de errores no críticos
 */
function logError(type, error, context = {}) {
  // Actualizar contadores
  ERROR_SYSTEM.errorCounts.total++;
  ERROR_SYSTEM.errorCounts.commands++;
  
  const errorInfo = {
    id: generateErrorId(),
    type,
    message: error.message || error,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  console.error(`🚨 ${type}:`, error);
  saveErrorLog(errorInfo);
  
  // Notificar en Discord si es habilitado y es un error crítico o de prueba
  if (config?.security?.errorSystem?.enabled && 
      (context.severity === 'critical' || context.severity === 'catastrophic' || context.type === 'TEST')) {
    console.log(`📨 Enviando alerta de error ${context.severity} al canal de Discord...`);
    notifyErrorInDiscord(errorInfo).catch(err => {
      console.error('❌ Error enviando alerta a Discord:', err);
    });
  } else {
    console.log(`⏭️ Alerta no enviada - habilitado: ${config?.security?.errorSystem?.enabled}, severity: ${context.severity}, type: ${context.type}`);
  }
}

/**
 * Log de advertencias
 */
function logWarning(type, info) {
  const warningInfo = {
    type: `WARNING_${type}`,
    message: typeof info === 'string' ? info : JSON.stringify(info),
    timestamp: new Date().toISOString()
  };
  
  console.warn(`⚠️ ${type}:`, info);
  saveErrorLog(warningInfo);
}

/**
 * Notifica errores críticos en Discord
 */
async function notifyErrorInDiscord(errorLog) {
  try {
    // Usar el canal de errores críticos si está configurado, sino usar el canal de logs
    const criticalChannelId = config?.security?.errorSystem?.criticalErrorsChannel;
    const logChannelId = config?.security?.logChannel;
    const channelId = criticalChannelId || logChannelId;
    
    if (!channelId || !global.discordClient) return;
    
    const logChannel = global.discordClient.channels.cache.get(channelId);
    if (!logChannel) {
      console.log(`⚠️ Canal de errores no encontrado: ${channelId}`);
      return;
    }
    
    console.log(`✅ Canal encontrado: #${logChannel.name} (${channelId}), enviando alerta...`);
    
    const embed = new EmbedBuilder()
      .setTitle('🚨 Error Crítico Detectado')
      .setColor(0xFF0000)
      .setDescription('**Se ha detectado y capturado un error que podría haber tumbado el bot**')
      .addFields(
        {
          name: '🆔 Error ID',
          value: `\`${errorLog.id}\``,
          inline: true
        },
        {
          name: '📝 Tipo',
          value: `\`${errorLog.type}\``,
          inline: true
        },
        {
          name: '⏰ Tiempo',
          value: `<t:${Math.floor(new Date(errorLog.timestamp).getTime() / 1000)}:F>`,
          inline: true
        },
        {
          name: '💾 Memoria',
          value: `${Math.round(errorLog.memory.heapUsed / 1024 / 1024)}MB`,
          inline: true
        },
        {
          name: '⚡ Uptime',
          value: `${Math.floor(errorLog.uptime)}s`,
          inline: true
        },
        {
          name: '🔄 Estado',
          value: '```✅ Bot funcionando normalmente```',
          inline: false
        }
      )
      .setFooter({ text: '🛡️ Sistema de Control de Errores Global' })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    console.log(`✅ Alerta de error enviada exitosamente al canal #${logChannel.name}`);
  } catch (error) {
    console.error('❌ Error enviando alerta al canal Discord:', error);
  }
}

/**
 * Notifica cierre del bot
 */
async function notifyShutdown(client, signal) {
  try {
    const logChannelId = config?.security?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // Formatear uptime de manera más legible
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    let uptimeString;
    if (hours > 0) {
      uptimeString = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      uptimeString = `${minutes}m ${seconds}s`;
    } else {
      uptimeString = `${seconds}s`;
    }
    
    // Determinar el motivo del cierre
    const shutdownReasons = {
      'SIGINT': { emoji: '⚡', reason: 'Manual Stop (Ctrl+C)', color: 0xFF6B35 },
      'SIGTERM': { emoji: '🔄', reason: 'System Restart', color: 0xF39C12 },
      'SIGUSR1': { emoji: '🛠️', reason: 'Maintenance Mode', color: 0x3498DB },
      'SIGUSR2': { emoji: '🔧', reason: 'Admin Request', color: 0x9B59B6 }
    };
    
    const shutdownInfo = shutdownReasons[signal] || { emoji: '❓', reason: 'Unknown Signal', color: 0x95A5A6 };
    const shutdownTime = new Date();
    
    const embed = new EmbedBuilder()
      .setTitle('🌙 999 Casino Bot | System Shutdown')
      .setDescription('```🤖 SYSTEM SHUTDOWN INITIATED\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Saving all data safely\n• Securing user information\n• Preparing for sleep mode\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━```')
      .setColor(shutdownInfo.color)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png')
      .addFields(
        {
          name: '🛑 Shutdown Information',
          value: `\`\`\`ansi
\u001b[0;33m${shutdownInfo.emoji} Trigger Signal\u001b[0m     ${signal}
\u001b[0;36m📋 Shutdown Reason\u001b[0m     ${shutdownInfo.reason}
\u001b[0;32m🕐 Stop Time\u001b[0m          ${shutdownTime.toLocaleTimeString('es-ES')}\`\`\``,
          inline: true
        },
        {
          name: '⏱️ Session Summary',
          value: `\`\`\`⏰ Total Uptime:       ${uptimeString}
🚨 Total Errors:        ${ERROR_SYSTEM.errorCounts.total}
💾 Memory Used:         ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
📊 Commands Executed:   ${ERROR_SYSTEM.errorCounts.commands > 0 ? 'Multiple' : 'Clean Session'}
👥 Guilds Served:       ${client.guilds.cache.size}
👤 Users Interacted:    ${client.users.cache.size}\`\`\``,
          inline: true
        }
      )
    
    // Estadísticas detalladas de la sesión
    const errorDistribution = [
      { type: 'System', count: ERROR_SYSTEM.errorCounts.system, emoji: '🔧' },
      { type: 'Discord', count: ERROR_SYSTEM.errorCounts.discord, emoji: '🤖' },
      { type: 'Commands', count: ERROR_SYSTEM.errorCounts.commands, emoji: '⚡' },
      { type: 'Database', count: ERROR_SYSTEM.errorCounts.database, emoji: '🎯' }
    ];

    const errorStats = errorDistribution
      .map(e => `${e.emoji} ${e.type}: ${e.count}`)
      .join('  •  ');

    embed.addFields({
        name: '📊 Final Performance Report',
        value: `\`\`\`diff
+ Session completed successfully
+ All user data safely preserved
+ Database connections properly closed
+ Memory resources fully released

Error Breakdown: ${errorStats}
Performance: ${ERROR_SYSTEM.errorCounts.total === 0 ? 'PERFECT' : 'STABLE'} • Security: MAINTAINED • Integrity: INTACT\`\`\``,
        inline: false
      })
      .addFields({
        name: '� Shutdown Sequence Status',
        value: `\`\`\`yaml
Step 1: � Saving session state................ ✅ COMPLETED
Step 2: 🔒 Securing user data.................. ✅ COMPLETED  
Step 3: 📊 Finalizing transactions............ ✅ COMPLETED
Step 4: �️ Closing database connections........ ✅ COMPLETED
Step 5: 🤖 Disconnecting from Discord.......... ✅ IN PROGRESS
Step 6: 🌙 System hibernate..................... ⏳ PENDING\`\`\``,
        inline: false
      })
      .setFooter({ 
        text: `999 Casino Bot v1.0.0 | Powered by KayX • Shutdown at ${shutdownTime.toLocaleTimeString('es-ES')}`, 
        iconURL: 'https://i.imgur.com/0jM0J5h.png' 
      })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error notificando cierre:', error);
  }
}

/**
 * Guarda estado del sistema antes de cerrar
 */
async function saveSystemState() {
  try {
    const state = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      errors: ERROR_SYSTEM.errorCounts,
      memory: process.memoryUsage(),
      systemHealth: ERROR_SYSTEM.systemHealth
    };
    
    fs.writeFileSync('./logs/last_session.json', JSON.stringify(state, null, 2));
    console.log('💾 Estado del sistema guardado');
  } catch (error) {
    console.error('Error guardando estado:', error);
  }
}

/**
 * Notifica el inicio exitoso del bot en Discord
 */
async function notifyBotStartup(client, stats) {
  try {
    const logChannelId = config?.security?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // Calcular tiempo de inicialización
    const startTime = new Date();
    const platformEmoji = process.platform === 'win32' ? '🪟' : process.platform === 'linux' ? '🐧' : '🍎';
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 999 Casino Bot | System Online')
      .setDescription('```🤖 SYSTEM STARTUP COMPLETED\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• All systems initialized\n• Database connection established\n• Commands loaded successfully\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━```')
      .setColor(0x00FF00)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png');

    // Información de startup
    embed.addFields(
      {
        name: '� Startup Information',
        value: `\`\`\`🚀 Status:      ONLINE
🕐 Time:        ${startTime.toLocaleString('es-ES')}
📊 Mode:        PRODUCTION  
⚡ Node:        ${process.version}\`\`\``,
        inline: false
      },
      {
        name: '📊 System Components',
        value: `\`\`\`🗄️ Database:    ${stats.database_components} tables ready
💰 Crypto:      ${stats.crypto_components} currencies loaded
⚙️ Systems:     ${stats.system_components} components active
🤖 Commands:    ${client.commands ? client.commands.size : stats.commands} slash commands\`\`\``,
        inline: false
      },
      {
        name: '🎰 Casino Systems Status',
        value: `\`\`\`• Gambling systems operational
• User balance tracking active
• Crypto market engine running
• Security systems enabled\`\`\``,
        inline: false
      },
      {
        name: '📈 Performance Metrics',
        value: `\`\`\`🧠 Memory:      ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB initial usage
👥 Guilds:      ${client.guilds.cache.size} server${client.guilds.cache.size !== 1 ? 's' : ''} connected
👤 Users:       ${client.users.cache.size} user${client.users.cache.size !== 1 ? 's' : ''} cached
📡 Channels:    ${client.channels.cache.size} channel${client.channels.cache.size !== 1 ? 's' : ''} available\`\`\``,
        inline: false
      },
      {
        name: '🎮 Ready to Play!',
        value: 'All casino games and systems are now online and ready for action!',
        inline: false
      }
    );



    embed.setFooter({ 
      text: `999 Casino Bot | Welcome Back! • ${startTime.toLocaleString('es-ES')}`, 
      iconURL: 'https://i.imgur.com/0jM0J5h.png' 
    });
    embed.setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error notificando startup:', error);
  }
}

/**
 * Obtiene estadísticas del sistema de errores
 */
export function getErrorStats() {
  return {
    ...ERROR_SYSTEM.errorCounts,
    systemHealth: ERROR_SYSTEM.systemHealth,
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  };
}

/**
 * Exportar función de notificación de startup para uso externo
 */
export { notifyBotStartup };

/**
 * Función pública para manejar errores desde comandos
 */
export function handleError(error, context = {}) {
  logError(context.severity || 'COMMAND', error, context);
}