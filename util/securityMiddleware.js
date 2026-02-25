// ═══════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE DE SEGURIDAD PARA COMANDOS
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder } from 'discord.js';
import { 
  isUserAuthorized, 
  isCommandAllowed, 
  validateBetAmount,
  validateCryptoInvestment,
  createSecurityErrorEmbed,
  logSecurityEvent,
  SECURITY_CONFIG
} from './securitySystem.js';

// Rate limiting storage
const userCommandCounts = new Map();
const userWarnings = new Map();

/**
 * Middleware principal de seguridad
 */
export async function securityMiddleware(interaction, commandName, next) {
  try {
    // 1. Verificar rate limiting
    const rateLimitCheck = checkRateLimit(interaction.user.id);
    if (!rateLimitCheck.allowed) {
      await sendRateLimitWarning(interaction, rateLimitCheck.remaining);
      return false;
    }

    // 2. Verificar autorización del usuario
    const authCheck = isUserAuthorized(interaction);
    if (!authCheck.authorized) {
      await sendAuthorizationError(interaction, authCheck.reason);
      logSecurityEvent('UNAUTHORIZED_ACCESS', interaction.user.id, {
        command: commandName,
        reason: authCheck.reason
      });
      return false;
    }

    // 3. Verificar si el comando está permitido
    const commandCheck = isCommandAllowed(commandName, interaction);
    if (!commandCheck.allowed) {
      await sendCommandError(interaction, commandCheck.reason);
      logSecurityEvent('BLOCKED_COMMAND', interaction.user.id, {
        command: commandName,
        reason: commandCheck.reason
      });
      return false;
    }

    // 4. Validaciones específicas por tipo de comando
    if (isGamblingCommand(commandName)) {
      const betValidation = await validateGamblingCommand(interaction);
      if (!betValidation.valid) {
        await sendBetLimitError(interaction, betValidation.reason);
        return false;
      }
    }

    if (isCryptoCommand(commandName)) {
      const cryptoValidation = await validateCryptoCommand(interaction);
      if (!cryptoValidation.valid) {
        await sendCryptoLimitError(interaction, cryptoValidation.reason);
        return false;
      }
    }

    // 5. Log del comando exitoso
    logSecurityEvent('COMMAND_EXECUTED', interaction.user.id, {
      command: commandName,
      channel: interaction.channel.id
    });

    // 6. Ejecutar el comando original
    return await next();

  } catch (error) {
    console.error('🛡️ Error en middleware de seguridad:', error);
    logSecurityEvent('MIDDLEWARE_ERROR', interaction.user.id, {
      error: error.message,
      command: commandName
    });
    
    await sendGenericError(interaction);
    return false;
  }
}

/**
 * Verifica rate limiting por usuario
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = userId;
  
  if (!userCommandCounts.has(userKey)) {
    userCommandCounts.set(userKey, { count: 1, resetTime: now + 60000 }); // 1 minuto
    return { allowed: true };
  }

  const userData = userCommandCounts.get(userKey);
  
  // Reset counter si ha pasado el tiempo
  if (now > userData.resetTime) {
    userCommandCounts.set(userKey, { count: 1, resetTime: now + 60000 });
    return { allowed: true };
  }

  userData.count++;
  
  const limit = SECURITY_CONFIG.TESTING_MODE ? 30 : 60; // Más estricto en testing
  
  if (userData.count > limit) {
    const remaining = Math.ceil((userData.resetTime - now) / 1000);
    return { allowed: false, remaining };
  }

  // Advertencia cerca del límite
  if (userData.count > limit * 0.8) {
    return { allowed: true, warning: true, remaining: userData.count };
  }

  return { allowed: true };
}

/**
 * Validaciones para comandos de apuestas
 */
async function validateGamblingCommand(interaction) {
  const options = interaction.options;
  
  // Buscar parámetro de apuesta
  let betAmount = 0;
  if (options.get('bet')) betAmount = options.get('bet').value;
  if (options.get('amount')) betAmount = options.get('amount').value;
  if (options.get('apuesta')) betAmount = options.get('apuesta').value;

  if (betAmount > 0) {
    const validation = validateBetAmount(betAmount, interaction.commandName);
    if (!validation.valid) {
      return { valid: false, reason: validation.reason };
    }
  }

  return { valid: true };
}

/**
 * Validaciones para comandos de crypto
 */
async function validateCryptoCommand(interaction) {
  const options = interaction.options;
  const subcommand = options.getSubcommand(false);
  
  if (subcommand === 'buy') {
    const amount = options.get('amount')?.value || 0;
    const validation = validateCryptoInvestment(amount);
    if (!validation.valid) {
      return { valid: false, reason: validation.reason };
    }
  }

  return { valid: true };
}

/**
 * Determina si es un comando de apuestas
 */
function isGamblingCommand(commandName) {
  const gamblingCommands = [
    'blackjack', 'coinflip', 'crash', 'dados', 'ruleta', 
    'tragamonedas', 'robbank', 'rob', 'rasca'
  ];
  return gamblingCommands.includes(commandName);
}

/**
 * Determina si es un comando de crypto
 */
function isCryptoCommand(commandName) {
  const cryptoCommands = ['crypto', 'crypto-market', 'crypto-analytics'];
  return cryptoCommands.includes(commandName);
}

// ═══════════════════════════════════════════════════════════════
// 📨 FUNCIONES DE RESPUESTA DE ERROR
// ═══════════════════════════════════════════════════════════════

async function sendAuthorizationError(interaction, reason) {
  const embed = createSecurityErrorEmbed(reason, true);
  
  embed.addFields({
    name: '🎫 ¿Cómo obtener acceso?',
    value: `\`\`\`yaml
1. Solicita el rol de "Beta Tester" a un admin
2. Reporta cualquier bug que encuentres
3. Ayuda a probar todas las funciones
4. Sé paciente durante las pruebas\`\`\``,
    inline: false
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendRateLimitWarning(interaction, remaining) {
  const embed = new EmbedBuilder()
    .setTitle('⚡ Límite de Velocidad')
    .setColor(0xFFAA00)
    .setDescription('**Has enviado demasiados comandos muy rápido**')
    .addFields({
      name: '⏱️ Tiempo de Espera',
      value: `Intenta de nuevo en **${remaining} segundos**`,
      inline: true
    })
    .setFooter({ text: '🛡️ Protección Anti-Spam' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendCommandError(interaction, reason) {
  const embed = createSecurityErrorEmbed(reason);
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendBetLimitError(interaction, reason) {
  const embed = new EmbedBuilder()
    .setTitle('💰 Límite de Apuesta')
    .setColor(0xFF4444)
    .setDescription(`**${reason}**`)
    .addFields({
      name: '🧪 Modo Beta Testing',
      value: `Durante las pruebas, las apuestas están limitadas para evitar problemas`,
      inline: false
    });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendCryptoLimitError(interaction, reason) {
  const embed = new EmbedBuilder()
    .setTitle('📈 Límite de Inversión Crypto')
    .setColor(0xFF4444)
    .setDescription(`**${reason}**`)
    .addFields({
      name: '🧪 Protección de Beta',
      value: `Las inversiones crypto están limitadas durante las pruebas`,
      inline: false
    });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendGenericError(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('⚠️ Error del Sistema')
    .setColor(0xFF0000)
    .setDescription('Ha ocurrido un error interno. Por favor, inténtalo más tarde.')
    .setFooter({ text: '🛡️ Error reportado automáticamente' });

  try {
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Error enviando mensaje de error:', error);
  }
}

/**
 * Función helper para aplicar middleware a un comando
 */
export function withSecurity(commandExecute) {
  return async function(interaction, ...args) {
    const success = await securityMiddleware(
      interaction, 
      interaction.commandName,
      () => commandExecute(interaction, ...args)
    );
    
    return success;
  };
}