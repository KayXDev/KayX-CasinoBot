// ═══════════════════════════════════════════════════════════════
// 🔍 SISTEMA DE MONITOREO Y ALERTAS DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Storage para estadísticas en tiempo real
const monitoringData = {
  commandsExecuted: 0,
  usersActive: new Set(),
  securityEvents: 0,
  alertsSent: 0,
  startTime: Date.now(),
  
  // Contadores por categoría
  gambling: 0,
  crypto: 0,
  admin: 0,
  social: 0,
  
  // Detección de patrones sospechosos
  rapidFireUsers: new Map(), // Users con muchos comandos rápidos
  highValueBets: [], // Apuestas altas
  failedAttempts: new Map(), // Intentos fallidos por usuario
};

/**
 * Registra la ejecución de un comando para monitoreo
 */
export function trackCommandExecution(userId, commandName, details = {}) {
  monitoringData.commandsExecuted++;
  monitoringData.usersActive.add(userId);
  
  // Categorizar comando
  if (isGamblingCommand(commandName)) monitoringData.gambling++;
  else if (isCryptoCommand(commandName)) monitoringData.crypto++;
  else if (isAdminCommand(commandName)) monitoringData.admin++;
  else monitoringData.social++;
  
  // Detectar rapid-fire (muchos comandos muy rápidos)
  detectRapidFire(userId);
  
  // Detectar apuestas altas
  if (details.betAmount && details.betAmount > 50000) {
    monitoringData.highValueBets.push({
      userId,
      commandName,
      amount: details.betAmount,
      timestamp: Date.now()
    });
    
    // Mantener solo las últimas 50 apuestas altas
    if (monitoringData.highValueBets.length > 50) {
      monitoringData.highValueBets.shift();
    }
  }
  
  // Limpiar datos antiguos cada 100 comandos
  if (monitoringData.commandsExecuted % 100 === 0) {
    cleanupOldData();
  }
}

/**
 * Registra un evento de seguridad
 */
export function trackSecurityEvent(type, userId, severity = 'info') {
  monitoringData.securityEvents++;
  
  // Contar intentos fallidos
  if (type.includes('BLOCKED') || type.includes('UNAUTHORIZED')) {
    const current = monitoringData.failedAttempts.get(userId) || 0;
    monitoringData.failedAttempts.set(userId, current + 1);
    
    // Alerta si muchos intentos fallidos
    if (current + 1 >= 5) {
      sendSuspiciousActivityAlert(userId, 'multiple_failed_attempts');
    }
  }
}

/**
 * Detecta usuarios con rapid-fire de comandos
 */
function detectRapidFire(userId) {
  const now = Date.now();
  
  if (!monitoringData.rapidFireUsers.has(userId)) {
    monitoringData.rapidFireUsers.set(userId, [now]);
    return;
  }
  
  const timestamps = monitoringData.rapidFireUsers.get(userId);
  timestamps.push(now);
  
  // Mantener solo los últimos 30 segundos
  const recent = timestamps.filter(time => now - time < 30000);
  monitoringData.rapidFireUsers.set(userId, recent);
  
  // Alerta si más de 20 comandos en 30 segundos
  if (recent.length > 20) {
    sendSuspiciousActivityAlert(userId, 'rapid_fire_commands');
  }
}

/**
 * Envía alertas de actividad sospechosa
 */
async function sendSuspiciousActivityAlert(userId, type) {
  try {
    const logChannelId = config?.security?.logChannel;
    if (!logChannelId) return;
    
    const client = global.discordClient; // Asumiendo que el cliente está disponible globalmente
    if (!client) return;
    
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;
    
    const user = await client.users.fetch(userId).catch(() => null);
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Actividad Sospechosa Detectada')
      .setColor(0xFF6600)
      .setDescription('**Se ha detectado un comportamiento potencialmente problemático**')
      .addFields(
        {
          name: '👤 Usuario',
          value: user ? `${user.tag} (${userId})` : `ID: ${userId}`,
          inline: true
        },
        {
          name: '🚨 Tipo de Alerta',
          value: getAlertTypeDescription(type),
          inline: true
        },
        {
          name: '📊 Estadísticas',
          value: getUserStats(userId),
          inline: false
        }
      )
      .setFooter({ text: '🔍 Sistema de Monitoreo Automático' })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    monitoringData.alertsSent++;
    
  } catch (error) {
    console.error('Error enviando alerta de seguridad:', error);
  }
}

/**
 * Obtiene estadísticas de un usuario específico
 */
function getUserStats(userId) {
  const failedAttempts = monitoringData.failedAttempts.get(userId) || 0;
  const rapidFireCount = monitoringData.rapidFireUsers.get(userId)?.length || 0;
  
  return `\`\`\`yaml
Intentos Fallidos: ${failedAttempts}
Comandos Recientes: ${rapidFireCount}
Estado: ${failedAttempts > 3 ? '🔴 Alto Riesgo' : '🟡 Monitoreo'}\`\`\``;
}

/**
 * Descripción del tipo de alerta
 */
function getAlertTypeDescription(type) {
  const descriptions = {
    rapid_fire_commands: '🔥 Demasiados comandos muy rápido',
    multiple_failed_attempts: '🚫 Múltiples intentos fallidos',
    high_value_betting: '💎 Apuestas de valor extremo',
    suspicious_pattern: '🔍 Patrón de uso sospechoso'
  };
  
  return descriptions[type] || '❓ Actividad desconocida';
}

/**
 * Genera reporte de estadísticas del bot
 */
export function generateMonitoringReport() {
  const uptime = Date.now() - monitoringData.startTime;
  const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    commandsExecuted: monitoringData.commandsExecuted,
    activeUsers: monitoringData.usersActive.size,
    securityEvents: monitoringData.securityEvents,
    alertsSent: monitoringData.alertsSent,
    
    commandsByCategory: {
      gambling: monitoringData.gambling,
      crypto: monitoringData.crypto,
      admin: monitoringData.admin,
      social: monitoringData.social
    },
    
    suspiciousActivity: {
      rapidFireUsers: monitoringData.rapidFireUsers.size,
      highValueBets: monitoringData.highValueBets.length,
      failedAttempts: Array.from(monitoringData.failedAttempts.entries()).length
    }
  };
}

/**
 * Crea embed con reporte de monitoreo
 */
export function createMonitoringEmbed() {
  const report = generateMonitoringReport();
  
  const embed = new EmbedBuilder()
    .setTitle('🔍 Reporte de Monitoreo del Bot')
    .setColor(0x3498DB)
    .setDescription('**Estadísticas de actividad y seguridad en tiempo real**')
    .addFields(
      {
        name: '📊 Estadísticas Generales',
        value: `\`\`\`yaml
⏱️ Tiempo Activo: ${report.uptime}
🎮 Comandos Ejecutados: ${report.commandsExecuted}
👥 Usuarios Activos: ${report.activeUsers}
🛡️ Eventos de Seguridad: ${report.securityEvents}
🚨 Alertas Enviadas: ${report.alertsSent}\`\`\``,
        inline: false
      },
      {
        name: '🎯 Comandos por Categoría',
        value: `\`\`\`yaml
🎰 Apuestas: ${report.commandsByCategory.gambling}
📈 Crypto: ${report.commandsByCategory.crypto}
👑 Admin: ${report.commandsByCategory.admin}
👥 Social: ${report.commandsByCategory.social}\`\`\``,
        inline: true
      },
      {
        name: '🚨 Actividad Sospechosa',
        value: `\`\`\`yaml
🔥 Rapid-Fire: ${report.suspiciousActivity.rapidFireUsers}
💎 Apuestas Altas: ${report.suspiciousActivity.highValueBets}
🚫 Intentos Fallidos: ${report.suspiciousActivity.failedAttempts}\`\`\``,
        inline: true
      }
    )
    .setFooter({ 
      text: '🔍 Actualizado automáticamente',
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
  
  return embed;
}

/**
 * Limpia datos antiguos para evitar memory leaks
 */
function cleanupOldData() {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Limpiar apuestas altas antiguas
  monitoringData.highValueBets = monitoringData.highValueBets.filter(
    bet => bet.timestamp > oneHourAgo
  );
  
  // Limpiar rapid-fire data antigua
  for (const [userId, timestamps] of monitoringData.rapidFireUsers.entries()) {
    const recent = timestamps.filter(time => now - time < 300000); // 5 minutos
    if (recent.length === 0) {
      monitoringData.rapidFireUsers.delete(userId);
    } else {
      monitoringData.rapidFireUsers.set(userId, recent);
    }
  }
  
  // Reset usuarios activos cada hora
  if (monitoringData.commandsExecuted % 500 === 0) {
    monitoringData.usersActive.clear();
  }
}

/**
 * Funciones de categorización
 */
function isGamblingCommand(commandName) {
  const gamblingCommands = [
    'blackjack', 'coinflip', 'crash', 'dados', 'ruleta', 
    'tragamonedas', 'robbank', 'rob', 'rasca', 'loteria'
  ];
  return gamblingCommands.includes(commandName);
}

function isCryptoCommand(commandName) {
  const cryptoCommands = ['crypto', 'crypto-market', 'crypto-analytics', 'crypto-news'];
  return cryptoCommands.includes(commandName);
}

function isAdminCommand(commandName) {
  return commandName.startsWith('admin-') || 
         ['maintenance', 'security', 'backup'].includes(commandName);
}

/**
 * Envía reporte diario automático
 */
export async function sendDailyReport() {
  try {
    const logChannelId = config?.security?.logChannel;
    if (!logChannelId) return;
    
    const client = global.discordClient;
    if (!client) return;
    
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;
    
    const embed = createMonitoringEmbed();
    embed.setTitle('📊 Reporte Diario de Actividad');
    embed.setColor(0x00AA00);
    
    await logChannel.send({ embeds: [embed] });
    
    console.log('📊 Reporte diario enviado');
    
  } catch (error) {
    console.error('Error enviando reporte diario:', error);
  }
}

// Programar reporte diario (cada 24 horas)
setInterval(sendDailyReport, 24 * 60 * 60 * 1000);