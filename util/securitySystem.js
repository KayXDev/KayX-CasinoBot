// ═══════════════════════════════════════════════════════════════
// 🛡️ SISTEMA DE SEGURIDAD AVANZADO PARA BOT CASINO
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// ═══════════════════════════════════════════════════════════════
// 🔒 CONFIGURACIÓN DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

export const SECURITY_CONFIG = {
  // Modo de operación del bot (desde config.yml)
  get TESTING_MODE() { 
    return config?.security?.testingMode || false; 
  },
  
  // Límites de seguridad para pruebas (desde config.yml)
  get TESTING_LIMITS() {
    return {
      MAX_BET: config?.security?.testingLimits?.maxBet || 5000,
      MAX_DAILY_WINNINGS: config?.security?.testingLimits?.maxDailyWinnings || 50000,
      MAX_BALANCE: config?.security?.testingLimits?.maxBalance || 500000,
      MAX_CRYPTO_INVESTMENT: config?.security?.testingLimits?.maxCryptoInvestment || 25000,
      COOLDOWN_MULTIPLIER: config?.security?.testingLimits?.cooldownMultiplier || 2,
    };
  },

  // Roles autorizados para usar el bot (desde config.yml)
  get AUTHORIZED_ROLES() {
    const roles = [];
    if (config?.adminRoles) roles.push(...config.adminRoles);
    if (config?.security?.betaTesterRole) roles.push(config.security.betaTesterRole);
    if (config?.security?.moderatorRole) roles.push(config.security.moderatorRole);
    return roles;
  },

  // Comandos restringidos solo para admins
  ADMIN_ONLY_COMMANDS: [
    'admin-give',
    'admin-giveall', 
    'admin-resetbalance',
    'admin-resetcooldown',
    'admin-crypto-setup',
    'admin-reset-prices',
    'admin-check-prices',
    'admin-crypto-news',
    'admin-removeitems',
    'admin-inventory',
    'admin-jail',
    'maintenance',
    'security',
    'backup'
  ],

  // Comandos de alto riesgo con límites especiales
  HIGH_RISK_COMMANDS: [
    'robbank',
    'crypto',
    'admin-giveall',
  ],

  // Usuarios en lista blanca (siempre pueden usar el bot)
  get WHITELIST_USERS() {
    const whitelist = [config?.ownerID].filter(Boolean);
    if (config?.security?.whitelist) {
      whitelist.push(...config.security.whitelist);
    }
    return whitelist;
  },

  // Usuarios en lista negra (bloqueados)
  get BLACKLIST_USERS() {
    return config?.security?.blacklist || [];
  },

  // Canales donde NO se puede usar el bot
  get BLOCKED_CHANNELS() {
    return config?.security?.restrictedChannels || [];
  }
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ FUNCIONES DE VALIDACIÓN DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si un usuario está autorizado para usar el bot
 */
export function isUserAuthorized(interaction) {
  const userId = interaction.user.id;
  const member = interaction.member;

  // Recargar config para obtener estado actual
  const currentConfig = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
  
  // Verificar modo de emergencia - solo owner puede usar comandos
  if (currentConfig?.security?.emergencyMode) {
    if (userId === currentConfig.ownerID) {
      return { authorized: true, reason: 'Owner durante emergencia' };
    }
    return { 
      authorized: false, 
      reason: '🚨 Bot en modo de emergencia - Solo comandos críticos disponibles' 
    };
  }

  // Lista negra - bloquear inmediatamente
  const blacklist = currentConfig?.security?.blacklist || [];
  if (blacklist.includes(userId)) {
    return { authorized: false, reason: 'Usuario en lista negra' };
  }

  // Lista blanca - autorizar inmediatamente (incluye owner)
  const whitelist = [currentConfig?.ownerID].filter(Boolean);
  if (currentConfig?.security?.whitelist) {
    whitelist.push(...currentConfig.security.whitelist);
  }
  if (whitelist.includes(userId)) {
    return { authorized: true, reason: 'Usuario en lista blanca' };
  }

  // Si no está en modo testing, permitir a todos
  if (!currentConfig?.security?.testingMode) {
    return { authorized: true, reason: 'Modo producción' };
  }

  // En modo testing, verificar roles
  if (member && member.roles && member.roles.cache) {
    const authorizedRoles = [];
    if (currentConfig?.adminRoles) authorizedRoles.push(...currentConfig.adminRoles);
    if (currentConfig?.security?.betaTesterRole) authorizedRoles.push(currentConfig.security.betaTesterRole);
    if (currentConfig?.security?.moderatorRole) authorizedRoles.push(currentConfig.security.moderatorRole);
    
    const hasAuthorizedRole = authorizedRoles.some(roleId => 
      member.roles.cache.has(roleId)
    );
    
    if (hasAuthorizedRole) {
      return { authorized: true, reason: 'Rol autorizado para beta testing' };
    }
  }

  return { 
    authorized: false, 
    reason: 'Beta testing activo - requiere rol autorizado' 
  };
}

/**
 * Verifica si un comando está permitido
 */
export function isCommandAllowed(commandName, interaction) {
  const userId = interaction.user.id;
  const channelId = interaction.channel.id;

  // Verificar canales bloqueados
  if (SECURITY_CONFIG.BLOCKED_CHANNELS.includes(channelId)) {
    return { allowed: false, reason: 'Canal no autorizado' };
  }

  // Verificar comandos de admin
  if (SECURITY_CONFIG.ADMIN_ONLY_COMMANDS.includes(commandName)) {
    if (!SECURITY_CONFIG.WHITELIST_USERS.includes(userId)) {
      return { allowed: false, reason: 'Comando restringido a administradores' };
    }
  }

  return { allowed: true, reason: 'Comando permitido' };
}

/**
 * Aplica límites de seguridad para apuestas
 */
export function validateBetAmount(amount, commandName) {
  if (!SECURITY_CONFIG.TESTING_MODE) {
    return { valid: true, adjustedAmount: amount };
  }

  const maxBet = SECURITY_CONFIG.TESTING_LIMITS.MAX_BET;
  
  if (amount > maxBet) {
    return { 
      valid: false, 
      adjustedAmount: maxBet,
      reason: `Apuesta limitada a ${maxBet.toLocaleString()} durante beta testing`
    };
  }

  return { valid: true, adjustedAmount: amount };
}

/**
 * Valida inversiones en crypto
 */
export function validateCryptoInvestment(amount) {
  if (!SECURITY_CONFIG.TESTING_MODE) {
    return { valid: true, adjustedAmount: amount };
  }

  const maxInvestment = SECURITY_CONFIG.TESTING_LIMITS.MAX_CRYPTO_INVESTMENT;
  
  if (amount > maxInvestment) {
    return { 
      valid: false, 
      adjustedAmount: maxInvestment,
      reason: `Inversión crypto limitada a ${maxInvestment.toLocaleString()} durante beta testing`
    };
  }

  return { valid: true, adjustedAmount: amount };
}

/**
 * Verifica límites de balance
 */
export function validateBalance(currentBalance, newAmount) {
  if (!SECURITY_CONFIG.TESTING_MODE) {
    return { valid: true };
  }

  const maxBalance = SECURITY_CONFIG.TESTING_LIMITS.MAX_BALANCE;
  
  if (currentBalance + newAmount > maxBalance) {
    return { 
      valid: false,
      reason: `Balance limitado a ${maxBalance.toLocaleString()} durante beta testing`
    };
  }

  return { valid: true };
}

/**
 * Genera un embed de error de seguridad
 */
export function createSecurityErrorEmbed(reason, isTemporary = true) {
  
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Acceso Restringido')
    .setColor(0xFF4444)
    .setDescription(`**${reason}**`)
    .setTimestamp();

  if (isTemporary && SECURITY_CONFIG.TESTING_MODE) {
    embed.addFields({
      name: '⚠️ Modo Beta Testing Activo',
      value: `\`\`\`yaml
🧪 El bot está en fase de pruebas
🎯 Solo usuarios autorizados pueden usarlo
🔜 Pronto disponible para todos los miembros
📞 Contacta a un administrador para acceso\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ 
    text: '🛡️ Sistema de Seguridad Casino Bot',
    iconURL: 'https://i.imgur.com/hMwxvcd.png'
  });

  return embed;
}

/**
 * Log de eventos de seguridad
 */
export function logSecurityEvent(type, userId, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    userId,
    details
  };

  // Guardar en archivo de logs de seguridad
  const logPath = './logs/security.json';
  let logs = [];
  
  try {
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading security logs:', error);
  }

  logs.push(logEntry);

  // Mantener solo los últimos 1000 logs
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }

  try {
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing security logs:', error);
  }

  console.log(`🛡️ Security Event: ${type} - User: ${userId}`);
}

// ═══════════════════════════════════════════════════════════════
// 🔄 FUNCIONES DE ADMINISTRACIÓN DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

/**
 * Activa/desactiva el modo testing
 */
export function toggleTestingMode(enabled) {
  try {
    // Recargar configuración actual
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    
    // Actualizar valor
    if (!config.security) config.security = {};
    config.security.testingMode = enabled;
    
    // Guardar en archivo
    fs.writeFileSync('./config.yml', yaml.dump(config, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false
    }));
    
    console.log(`🛡️ Testing mode ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    return true;
  } catch (error) {
    console.error('Error updating config.yml:', error);
    return false;
  }
}

/**
 * Añade un usuario a la lista blanca
 */
export function addToWhitelist(userId) {
  try {
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    
    if (!config.security) config.security = {};
    if (!config.security.whitelist) config.security.whitelist = [];
    
    if (!config.security.whitelist.includes(userId)) {
      config.security.whitelist.push(userId);
      
      fs.writeFileSync('./config.yml', yaml.dump(config, { 
        indent: 2,
        lineWidth: 120,
        quotingType: '"',
        forceQuotes: false
      }));
      
      console.log(`🛡️ Usuario ${userId} añadido a la lista blanca`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating whitelist:', error);
    return false;
  }
}

/**
 * Remueve un usuario de la lista blanca
 */
export function removeFromWhitelist(userId) {
  try {
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    
    if (!config.security?.whitelist) return false;
    
    const index = config.security.whitelist.indexOf(userId);
    if (index > -1) {
      config.security.whitelist.splice(index, 1);
      
      fs.writeFileSync('./config.yml', yaml.dump(config, { 
        indent: 2,
        lineWidth: 120,
        quotingType: '"',
        forceQuotes: false
      }));
      
      console.log(`🛡️ Usuario ${userId} removido de la lista blanca`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating whitelist:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas de seguridad
 */
export function getSecurityStats() {
  return {
    testingMode: SECURITY_CONFIG.TESTING_MODE,
    authorizedRoles: SECURITY_CONFIG.AUTHORIZED_ROLES.length,
    whitelistUsers: SECURITY_CONFIG.WHITELIST_USERS.length,
    blacklistUsers: SECURITY_CONFIG.BLACKLIST_USERS.length,
    blockedChannels: SECURITY_CONFIG.BLOCKED_CHANNELS.length
  };
}