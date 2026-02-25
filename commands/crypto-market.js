// ═══════════════════════════════════════════════════════════════
// 🏛️ CASINO METAVERSE EXCHANGE - MARKET COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import marketEngine from '../util/crypto/marketEngine.js';
import achievementsManager from '../util/crypto/achievementsManager.js';
import { createAchievementProgressEmbed, processAchievementResults } from '../util/crypto/achievementNotifications.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import { getUserBalance, updateUserBalance } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Trading cooldowns tracking
const tradingCooldowns = new Map(); // userId -> { lastTrade: timestamp, tradeCount: number }

// Auto-refresh tracking para crypto market
const activeMarketMessages = new Map(); // messageId -> { interval, message }

// Función para verificar restricciones de trading
async function checkTradingRestrictions(userId, tradeType, amount = 0) {
  const restrictions = config.crypto?.restrictions || {};
  const now = Date.now();
  
  // 🕐 Verificar si el mercado está abierto para trading
  const marketStatus = marketEngine.getMarketStatus();
  if (!marketStatus.isOpen && tradeType !== 'view') {
    const nextOpenText = marketStatus.nextOpen 
      ? `Reabre: **${marketStatus.nextOpen.toLocaleString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: config.crypto?.schedule?.timezone || 'Europe/Madrid'
        })}**`
      : 'Horario por determinar';
    
    return {
      allowed: false,
      reason: `🏪 **Mercado Cerrado**\n${marketStatus.reason}\n\n${marketStatus.showNextOpen ? nextOpenText : ''}\n\n${marketStatus.allowViewing ? '💡 Puedes ver precios pero no tradear.' : ''}`
    };
  }
  
  // Verificar cooldown SOLO desde la tabla de cooldowns (no por fecha de trade real)
  const { getUserTradeCooldown } = await import('../util/crypto/cryptoDailyTrades.js');
  const lastTrade = await getUserTradeCooldown(userId);
  if (lastTrade && (now - lastTrade) < (restrictions.tradeCooldown || 300) * 1000) {
    const remainingTime = Math.ceil(((restrictions.tradeCooldown || 300) * 1000 - (now - lastTrade)) / 1000);
    return {
      allowed: false,
      reason: `⏰ **Cooldown activo**\nDebes esperar **${remainingTime}s** antes del próximo trade.`
    };
  }

  // Verificar límite de trades diarios (24h window)
  if (tradeType === 'buy' || tradeType === 'sell') {
    const { getUserDailyTradeCount, getLastUserTradeTimestamp } = await import('../util/crypto/cryptoDailyTrades.js');
    const dailyCount = await getUserDailyTradeCount(userId);
    const maxDailyTrades = restrictions.maxDailyTrades || 3;
    if (dailyCount >= maxDailyTrades) {
      // Obtener timestamp del último trade
      const lastTrade = await getLastUserTradeTimestamp(userId);
      let timeLeft = 0;
      if (lastTrade) {
        const nextAllowed = lastTrade + 24 * 60 * 60 * 1000;
        timeLeft = nextAllowed - Date.now();
      }
      let timeMsg = '';
      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timeMsg = `\n⏳ Podrás volver a tradear en **${hours}h ${minutes}m ${seconds}s**.`;
      }
      return {
        allowed: false,
        reason: `🚫 **Límite diario alcanzado**\nSolo puedes realizar **${maxDailyTrades}** trades cada 24h.${timeMsg}`
      };
    }
  }

  // Verificar límites por transacción
  if (tradeType === 'buy') {
    const maxTrade = restrictions.maxInvestment || 250000;
    if (amount > maxTrade) {
      return {
        allowed: false,
        reason: `💸 **Límite excedido**\nMáximo por trade: **${maxTrade}** monedas.\nIntentaste: **${amount}** monedas.`
      };
    }

    const minTrade = restrictions.minInvestment || 500;
    if (amount < minTrade) {
      return {
        allowed: false,
        reason: `💰 **Monto muy pequeño**\nMínimo por trade: **${minTrade}** monedas.\nIntentaste: **${amount}** monedas.`
      };
    }
  }

  return { allowed: true };
}

// Función para aplicar cooldown en base de datos
async function applyTradingCooldown(userId) {
  const { setUserTradeCooldown } = await import('../util/crypto/cryptoDailyTrades.js');
  await setUserTradeCooldown(userId, Date.now());
}

export const data = new SlashCommandBuilder()
  .setName('crypto')
  .setDescription('🏛️ Access the Casino Metaverse Exchange')
  .addSubcommand(subcommand =>
    subcommand
      .setName('market')
      .setDescription('📊 View live crypto market data and prices')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('buy')
      .setDescription('🛒 Buy cryptocurrency with your casino coins')
      .addStringOption(option =>
        option
          .setName('crypto')
          .setDescription('Which cryptocurrency to buy')
          .setRequired(true)
          .addChoices(
            { name: '🟠 BTC - Bitcoin (LEGENDARY)', value: 'BTC' },
            { name: '💙 ETH - Ethereum (LEGENDARY)', value: 'ETH' },
            { name: '🟡 BNB - Binance Coin (EPIC)', value: 'BNB' },
            { name: '💜 SOL - Solana (EPIC)', value: 'SOL' },
            { name: '🔵 ADA - Cardano (RARE)', value: 'ADA' },
            { name: '🟣 MATIC - Polygon (RARE)', value: 'MATIC' },
            { name: '🔗 LINK - Chainlink (EPIC)', value: 'LINK' },
            { name: '🔺 AVAX - Avalanche (EPIC)', value: 'AVAX' },
            { name: '🔴 DOT - Polkadot (RARE)', value: 'DOT' },
            { name: '⚛️ ATOM - Cosmos (RARE)', value: 'ATOM' },
            { name: '⚫ ALGO - Algorand (COMMON)', value: 'ALGO' },
            { name: '💧 XRP - Ripple (RARE)', value: 'XRP' }
          )
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Amount of casino coins to invest')
          .setRequired(true)
          .setMinValue(500)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('sell')
      .setDescription('💰 Sell your cryptocurrency holdings')
      .addStringOption(option =>
        option
          .setName('crypto')
          .setDescription('Which cryptocurrency to sell')
          .setRequired(true)
          .addChoices(
            { name: '🟠 BTC - Bitcoin (LEGENDARY)', value: 'BTC' },
            { name: '💙 ETH - Ethereum (LEGENDARY)', value: 'ETH' },
            { name: '🟡 BNB - Binance Coin (EPIC)', value: 'BNB' },
            { name: '💜 SOL - Solana (EPIC)', value: 'SOL' },
            { name: '🔵 ADA - Cardano (RARE)', value: 'ADA' },
            { name: '🟣 MATIC - Polygon (RARE)', value: 'MATIC' },
            { name: '🔗 LINK - Chainlink (EPIC)', value: 'LINK' },
            { name: '🔺 AVAX - Avalanche (EPIC)', value: 'AVAX' },
            { name: '🔴 DOT - Polkadot (RARE)', value: 'DOT' },
            { name: '⚛️ ATOM - Cosmos (RARE)', value: 'ATOM' },
            { name: '⚫ ALGO - Algorand (COMMON)', value: 'ALGO' },
            { name: '💧 XRP - Ripple (RARE)', value: 'XRP' }
          )
      )
      .addStringOption(option =>
        option
          .setName('amount')
          .setDescription('Amount to sell (number of tokens or "all" for everything)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('portfolio')
      .setDescription('📊 View your crypto portfolio with real-time P&L')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('achievements')
      .setDescription('🏆 View your crypto trading achievements and progress')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('trades')
      .setDescription('📈 Ver el número de trades realizados hoy (solo admin, puedes consultar a otros)')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario a consultar (opcional)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('resetcooldown')
      .setDescription('🔧 Resetear el cooldown de trading (solo admin)')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario a resetear cooldown')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  try {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'market') {
      await handleMarketCommand(interaction);
    } else if (subcommand === 'buy') {
      await handleBuyCommand(interaction);
    } else if (subcommand === 'sell') {
      await handleSellCommand(interaction);
    } else if (subcommand === 'portfolio') {
      await handlePortfolioCommand(interaction);
    } else if (subcommand === 'achievements') {
      await handleAchievementsCommand(interaction);
    }
    // Nuevo subcomando: /crypto trades
    else if (subcommand === 'trades') {
      await handleTradesCommand(interaction);
    }
    // Nuevo subcomando: /crypto resetcooldown
    else if (subcommand === 'resetcooldown') {
      await handleResetCooldownCommand(interaction);
    }
  } catch (error) {
    console.error('Error in crypto command execution:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the command.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
// Handler para /crypto trades (solo admin, permite consultar a otros)
async function handleTradesCommand(interaction) {
  // Obtener ownerID y adminRoles del config (compatible ESM)
  const fs = (await import('fs')).default;
  const yaml = (await import('js-yaml')).default;
  const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
  const ownerId = config.ownerID;
  const adminRoles = Array.isArray(config.adminRoles) ? config.adminRoles : [];
  // Permitir solo si es owner o tiene rol admin
  const member = interaction.member;
  const isAdmin = interaction.user.id === ownerId || (member && member.roles && member.roles.cache && adminRoles.some(r => member.roles.cache.has(r)));
  if (!isAdmin) {
    return await interaction.reply({
      content: '⛔ Solo el administrador puede usar este comando.',
      flags: MessageFlags.Ephemeral
    });
  }
  const user = interaction.options.getUser('usuario') || interaction.user;
  try {
    const { getUserDailyTradeCount } = await import('../util/crypto/cryptoDailyTrades.js');
    const count = await getUserDailyTradeCount(user.id);
    const maxDailyTrades = (interaction.client?.config?.crypto?.restrictions?.maxDailyTrades) || 3;
    await interaction.reply({
      content: `📈 Hoy <@${user.id}> lleva **${count}**/${maxDailyTrades} trades realizados.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    await interaction.reply({
      content: '❌ Error al consultar los trades diarios.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Handler para /crypto resetcooldown (solo admin)
async function handleResetCooldownCommand(interaction) {
  // Obtener ownerID y adminRoles del config (compatible ESM)
  const fs = (await import('fs')).default;
  const yaml = (await import('js-yaml')).default;
  const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
  const ownerId = config.ownerID;
  const adminRoles = Array.isArray(config.adminRoles) ? config.adminRoles : [];
  // Permitir solo si es owner o tiene rol admin
  const member = interaction.member;
  const isAdmin = interaction.user.id === ownerId || (member && member.roles && member.roles.cache && adminRoles.some(r => member.roles.cache.has(r)));
  if (!isAdmin) {
    return await interaction.reply({
      content: '⛔ Solo el administrador puede usar este comando.',
      flags: MessageFlags.Ephemeral
    });
  }
  const user = interaction.options.getUser('usuario');
  if (!user) {
    return await interaction.reply({
      content: '❌ Usuario no encontrado.',
      flags: MessageFlags.Ephemeral
    });
  }
  // Resetear cooldown en base de datos
  const { resetUserTradeCooldown } = await import('../util/crypto/cryptoDailyTrades.js');
  await resetUserTradeCooldown(user.id);
  await interaction.reply({
    content: `✅ Cooldown de trading reseteado para <@${user.id}>.`,
    flags: MessageFlags.Ephemeral
  });
}
}

async function handleMarketCommand(interaction) {
  try {
    // Obtener datos del mercado inmediatamente
    const marketData = marketEngine.getMarketData();
    
    if (!marketData.cryptos || marketData.cryptos.length === 0) {
      return await interaction.reply({
        content: '❌ Market data is currently unavailable. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Crear embed con botón de refresh
    const marketEmbed = createMarketEmbed(marketData);
    const buttons = createMarketButtons();

    // Responder inmediatamente con botones
    await interaction.reply({
      embeds: [marketEmbed],
      components: [buttons]
    });

    // Obtener el mensaje para auto-refresh
    const message = await interaction.fetchReply();

    // Configurar auto-refresh
    setupAutoRefresh(message);

    // Log del comando
    const sentiment = isNaN(marketData.marketSentiment) ? 50 : marketData.marketSentiment;
    logGamblingCommand(interaction.user, 'crypto-market', {
      action: 'Market View',
      result: `Viewed market with ${marketData.cryptos.length} cryptos`,
      additional: `Sentiment: ${sentiment.toFixed(1)}/100`
    }).catch(err => console.error('Logging error:', err));

  } catch (error) {
    console.error('Error in crypto market command:', error);
    
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ An error occurred while fetching market data. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// � SELL COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleSellCommand(interaction) {
  const userId = interaction.user.id;
  const cryptoSymbol = interaction.options.getString('crypto');
  const amountInput = interaction.options.getString('amount');
  
  try {
    // Verificar restricciones de trading (sin monto específico para sell)
    const restrictionCheck = await checkTradingRestrictions(userId, 'sell');
    if (!restrictionCheck.allowed) {
      return await interaction.reply({
        content: restrictionCheck.reason,
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Verificar holdings del usuario
    const userHolding = await getUserCryptoHolding(userId, cryptoSymbol);
    
    if (!userHolding || userHolding.amount <= 0) {
      return await interaction.reply({
        content: `📭 **No tienes holdings de ${cryptoSymbol}**\n\nNo posees esta cryptocurrency en tu portfolio.\n\n*Usa \`/crypto buy\` para comprar primero.*`,
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Convertir valores de la DB a números
    userHolding.amount = parseFloat(userHolding.amount);
    userHolding.avg_buy_price = parseFloat(userHolding.avg_buy_price);
    
    // Procesar cantidad a vender
    let tokensToSell;
    let isSellingAll = false;
    
    if (amountInput.toLowerCase() === 'all') {
      tokensToSell = userHolding.amount;
      isSellingAll = true;
    } else {
      tokensToSell = parseFloat(amountInput);
      
      if (isNaN(tokensToSell) || tokensToSell <= 0) {
        return await interaction.reply({
          content: '❌ **Cantidad inválida**\n\nIngresa un número válido o "all" para vender todo.',
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (tokensToSell > userHolding.amount) {
        return await interaction.reply({
          content: `📉 **Holdings insuficientes**\n\nTienes **${userHolding.amount.toFixed(6)} ${cryptoSymbol}** pero intentas vender **${tokensToSell}**.\n\n*Usa "all" para vender todo tu holding.*`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
    
    // Obtener precio actual de la crypto
    const marketData = marketEngine.getMarketData();
    const crypto = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
    
    if (!crypto) {
      return await interaction.reply({
        content: '❌ Cryptocurrency no encontrada.',
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Calcular valor de la venta
    const saleValue = tokensToSell * crypto.price;
    const profitLoss = (crypto.price - userHolding.avg_buy_price) * tokensToSell;
    
    // Crear embed de confirmación
    const confirmEmbed = createSellConfirmationEmbed(crypto, tokensToSell, saleValue, userHolding, profitLoss, isSellingAll);
    
    // Crear botones de confirmación
    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_sell_${cryptoSymbol}_${tokensToSell}`)
          .setLabel('✅ Confirmar Venta')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_sell')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmRow]
    });
    
    // Collector para los botones de confirmación
    const confirmFilter = (btnInteraction) => btnInteraction.user.id === userId;
    const confirmCollector = response.createMessageComponentCollector({
      filter: confirmFilter,
      time: 60000 // 1 minuto para confirmar
    });
    
    confirmCollector.on('collect', async (btnInteraction) => {
      try {
        if (btnInteraction.customId.startsWith('confirm_sell_')) {
          await processSellTransaction(btnInteraction, cryptoSymbol, tokensToSell, saleValue, crypto, userHolding, isSellingAll);
        } else if (btnInteraction.customId === 'cancel_sell') {
          await btnInteraction.update({
            embeds: [new EmbedBuilder()
              .setColor('#ff6b6b')
              .setTitle('❌ Venta Cancelada')
              .setDescription('La transacción ha sido cancelada.')
            ],
            components: []
          });
        }
      } catch (error) {
        console.error('Error in sell confirmation:', error);
        await btnInteraction.reply({
          content: '❌ Error al procesar la venta. Intenta de nuevo.',
          flags: MessageFlags.Ephemeral
        });
      }
    });
    
    confirmCollector.on('end', (collected) => {
      if (collected.size === 0) {
        // Timeout - cancelar automáticamente
        interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('⏰ Tiempo Agotado')
            .setDescription('La confirmación de venta ha expirado.')
          ],
          components: []
        }).catch(() => {}); // Ignore errors if message was already deleted
      }
    });
    
  } catch (error) {
    console.error('Error in sell command:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error al procesar la venta. Intenta de nuevo.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// �🛒 BUY COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleBuyCommand(interaction) {
  const userId = interaction.user.id;
  const cryptoSymbol = interaction.options.getString('crypto');
  const investmentAmount = interaction.options.getInteger('amount');
  
  try {
    // Verificar restricciones de trading
    const restrictionCheck = await checkTradingRestrictions(userId, 'buy', investmentAmount);
    if (!restrictionCheck.allowed) {
      return await interaction.reply({
        content: restrictionCheck.reason,
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Verificar balance del usuario
    const userBalance = await getUserBalance(userId);
    if (userBalance < investmentAmount) {
      return await interaction.reply({
        content: `💸 **Fondos Insuficientes**\n\nNecesitas **${investmentAmount}** monedas pero solo tienes **${userBalance}**.\n\n*Usa otros comandos del casino para ganar más monedas.*`,
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Obtener precio actual de la crypto
    const marketData = marketEngine.getMarketData();
    const crypto = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
    
    if (!crypto) {
      return await interaction.reply({
        content: '❌ Cryptocurrency no encontrada.',
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Calcular cantidad de tokens que puede comprar
    const tokensToReceive = investmentAmount / crypto.price;
    
    // Crear embed de confirmación
    const confirmEmbed = createBuyConfirmationEmbed(crypto, investmentAmount, tokensToReceive, userBalance);
    
    // Crear botones de confirmación
    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_buy_${cryptoSymbol}_${investmentAmount}`)
          .setLabel('✅ Confirmar Compra')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_buy')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmRow]
    });
    
    // Collector para los botones de confirmación
    const confirmFilter = (btnInteraction) => btnInteraction.user.id === userId;
    const confirmCollector = response.createMessageComponentCollector({
      filter: confirmFilter,
      time: 60000 // 1 minuto para confirmar
    });
    
    confirmCollector.on('collect', async (btnInteraction) => {
      try {
        if (btnInteraction.customId.startsWith('confirm_buy_')) {
          await processBuyTransaction(btnInteraction, cryptoSymbol, investmentAmount, tokensToReceive, crypto);
        } else if (btnInteraction.customId === 'cancel_buy') {
          await btnInteraction.update({
            embeds: [new EmbedBuilder()
              .setColor('#ff6b6b')
              .setTitle('❌ Compra Cancelada')
              .setDescription('La transacción ha sido cancelada.')
            ],
            components: []
          });
        }
      } catch (error) {
        console.error('Error in buy confirmation:', error);
        await btnInteraction.reply({
          content: '❌ Error al procesar la compra. Intenta de nuevo.',
          flags: MessageFlags.Ephemeral
        });
      }
    });
    
    confirmCollector.on('end', (collected) => {
      if (collected.size === 0) {
        // Timeout - cancelar automáticamente
        interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('⏰ Tiempo Agotado')
            .setDescription('La confirmación de compra ha expirado.')
          ],
          components: []
        }).catch(() => {}); // Ignore errors if message was already deleted
      }
    });
    
  } catch (error) {
    console.error('Error in buy command:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error al procesar la compra. Intenta de nuevo.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

function createMarketEmbed(marketData) {
  // 🕐 Obtener estado del mercado
  const marketStatus = marketEngine.getMarketStatus();
  
  // Determinar color del embed basado en sentiment (con fallback para NaN)
  const sentiment = isNaN(marketData.marketSentiment) ? 50 : marketData.marketSentiment;
  let embedColor = '#1a1a2e'; // Default dark blue
  let sentimentIcon = '📊';
  let sentimentText = 'NEUTRAL';
  
  if (sentiment >= 75) {
    embedColor = '#0d7377'; // Green - Extreme Greed
    sentimentIcon = '🚀';
    sentimentText = 'EXTREME GREED';
  } else if (sentiment >= 60) {
    embedColor = '#2ecc71'; // Light green - Greed
    sentimentIcon = '📈';
    sentimentText = 'GREED';
  } else if (sentiment <= 25) {
    embedColor = '#c73e1d'; // Red - Extreme Fear
    sentimentIcon = '💥';
    sentimentText = 'EXTREME FEAR';
  } else if (sentiment <= 40) {
    embedColor = '#e67e22'; // Orange - Fear
    sentimentIcon = '📉';
    sentimentText = 'FEAR';
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle('🏛️ **CASINO METAVERSE EXCHANGE** 🏛️')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .setTimestamp();

  // Ordenar cryptos por tier y precio
  const sortedCryptos = marketData.cryptos.sort((a, b) => {
    const tierOrder = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
    return (tierOrder[b.tier] || 1) - (tierOrder[a.tier] || 1) || b.price - a.price;
  });

  // Crear display de cryptos
  let cryptoDisplay = '';
  
  for (const crypto of sortedCryptos) {
    const priceFormatted = formatPrice(crypto.price);
    const change1h = crypto.change1h || 0;
    const change24h = crypto.change24h || 0;
    
    // Determinar indicadores de cambio
    const change1hIcon = change1h >= 0 ? '📈' : '📉';
    const change1hText = `${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%`;
    
    // Determinar intensidad de volatilidad
    const volIcons = {
      'LOW': '🛡️',
      'MEDIUM': '⚖️', 
      'HIGH': '🔥',
      'EXTREME': '⚡',
      'INSANE': '🌙'
    };
    
    const volIcon = volIcons[crypto.volatility] || '📊';
    const momentumIcon = Math.abs(crypto.momentum) > 0.5 ? '🚀' : Math.abs(crypto.momentum) > 0.2 ? '📊' : '💤';
    
    cryptoDisplay += `│ ${crypto.emoji} **${crypto.symbol.padEnd(4)}** $${priceFormatted} ${change1hIcon} ${change1hText.padStart(8)} ${volIcon} ${momentumIcon} │\n`;
  }

  embed.addFields({
    name: '📊 **LIVE MARKET** (Updates every 30s)',
    value: `\`\`\`\n┌─────────────────────────────────────────────────┐\n${cryptoDisplay}└─────────────────────────────────────────────────┘\n\`\`\``,
    inline: false
  });

  // Eventos activos
  let eventsText = '';
  if (marketData.activeEvents && marketData.activeEvents.length > 0) {
    for (const event of marketData.activeEvents) {
      const timeRemaining = calculateTimeRemaining(event.endsAt);
      eventsText += `${event.emoji || '🎪'} **${event.title}**: ${timeRemaining}\n`;
    }
  } else {
    eventsText = '📅 No active events - Market operating normally';
  }

  embed.addFields({
    name: '⚡ **ACTIVE EVENTS**',
    value: eventsText,
    inline: false
  });

  // 🕐 Estado del mercado
  let marketStatusText = '';
  if (marketStatus.isOpen) {
    marketStatusText = '🟢 **MERCADO ABIERTO** - Trading activo';
  } else {
    marketStatusText = `🔴 **MERCADO CERRADO** - ${marketStatus.reason}`;
    if (marketStatus.showNextOpen && marketStatus.nextOpen) {
      const nextOpenText = marketStatus.nextOpen.toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: config.crypto?.schedule?.timezone || 'Europe/Madrid'
      });
      marketStatusText += `\n📅 Reabre: **${nextOpenText}**`;
    }
    if (marketStatus.allowViewing) {
      marketStatusText += '\n💡 Solo visualización disponible';
    }
  }

  embed.addFields({
    name: '🕐 **ESTADO DEL MERCADO**',
    value: marketStatusText,
    inline: false
  });

  // Market sentiment y estadísticas
  const sentimentBar = createSentimentBar(sentiment);
  
  // Trading fees desde config
  const buyFee = (config.crypto?.fees?.buyFee || 0.5).toFixed(1);
  const sellFee = (config.crypto?.fees?.sellFee || 0.75).toFixed(1);
  
  embed.addFields({
    name: '🎯 **MARKET OVERVIEW**',
    value: `\`\`\`\n🎭 Sentiment: ${sentimentText} (${sentiment.toFixed(1)}/100)\n${sentimentBar}\n\n📈 Last Update: ${marketData.lastUpdate.toLocaleTimeString()}\n🔄 Auto-refresh: Every 30 seconds\n💹 Trading Fees: ${buyFee}% buy | ${sellFee}% sell\n\`\`\``,
    inline: false
  });

  // Footer con información adicional
  const totalMarketCap = sortedCryptos.reduce((total, crypto) => {
    const price = parseFloat(crypto.price) || 0;
    const supply = parseInt(crypto.circulating_supply) || 1000000;
    return total + (price * supply);
  }, 0);
  
  embed.setFooter({
    text: `💰 Market Cap: $${formatLargeNumber(totalMarketCap)} | 🏛️ Casino Exchange | ${sortedCryptos.length} Active Cryptos`
  });

  return embed;
}

function createMarketButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('crypto_refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚡')
    );
}

function formatPrice(price) {
  // Asegurar que price sea un número
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return '0.00';
  }
  
  if (numPrice >= 1000) {
    return numPrice.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (numPrice >= 1) {
    return numPrice.toFixed(2);
  } else if (numPrice >= 0.01) {
    return numPrice.toFixed(4);
  } else {
    return numPrice.toFixed(8);
  }
}

function formatLargeNumber(number) {
  const num = typeof number === 'string' ? parseFloat(number) : number;
  
  if (isNaN(num)) {
    return '0';
  }
  
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function createSentimentBar(sentiment) {
  const barLength = 20;
  const filled = Math.round((sentiment / 100) * barLength);
  const empty = barLength - filled;
  
  let bar = '';
  
  // Extreme Fear (0-25)
  if (sentiment <= 25) {
    bar = '🟥'.repeat(filled) + '⬛'.repeat(empty);
  }
  // Fear (25-40)  
  else if (sentiment <= 40) {
    bar = '🟧'.repeat(filled) + '⬛'.repeat(empty);
  }
  // Neutral (40-60)
  else if (sentiment <= 60) {
    bar = '🟨'.repeat(filled) + '⬛'.repeat(empty);
  }
  // Greed (60-75)
  else if (sentiment <= 75) {
    bar = '🟩'.repeat(filled) + '⬛'.repeat(empty);
  }
  // Extreme Greed (75-100)
  else {
    bar = '🟢'.repeat(filled) + '⬛'.repeat(empty);
  }
  
  return bar;
}

function calculateTimeRemaining(endTime) {
  if (!endTime) return 'Unknown';
  
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ended';
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

// Manejador de botones del crypto market
async function handleMarketButton(btnInteraction) {
  const action = btnInteraction.customId;

  switch (action) {
    case 'crypto_portfolio':
      await btnInteraction.reply({
        content: '📊 **Portfolio Dashboard Activado** ✅\n\nUsa el comando `/crypto portfolio` para ver:\n\n• 💰 Todos tus holdings actuales\n• 📈 P&L en tiempo real\n• 🎯 Mejor/peor performer\n• 🔄 Actualización instantánea\n• 📊 Valor total del portfolio\n\n*Dashboard completo con estadísticas avanzadas*',
        flags: MessageFlags.Ephemeral
      });
      break;

    case 'crypto_buy':
      await btnInteraction.reply({
        content: '🛒 **Sistema de Compras Activado** ✅\n\nUsa el comando `/crypto buy` para comprar cryptocurrencies reales:\n\n• **BTC** - Bitcoin (LEGENDARY) 🟠\n• **ETH** - Ethereum (LEGENDARY) 💙\n• **BNB** - Binance Coin (EPIC) �\n• **SOL** - Solana (EPIC) �\n\n*Inversión mínima: 100 monedas del casino*',
        flags: MessageFlags.Ephemeral
      });
      break;

    case 'crypto_sell':
      await btnInteraction.reply({
        content: '💰 **Sistema de Ventas Activado** ✅\n\nUsa el comando `/crypto sell` para vender tus holdings:\n\n• Vende por cantidad específica: `/crypto sell crypto:BTC amount:0.01`\n• Vende todo: `/crypto sell crypto:ETH amount:all`\n• Ver P&L en tiempo real\n• Cálculo automático de ganancias/pérdidas\n\n*Solo puedes vender cryptos que poseas en tu portfolio*',
        flags: MessageFlags.Ephemeral
      });
      break;

    case 'crypto_research':
      await btnInteraction.reply({
        content: '🔍 **Próximamente: Análisis Técnico**\n\nEsta función estará disponible pronto. Te permitirá:\n• Ver análisis técnico detallado\n• Predicciones basadas en patrones\n• Recomendaciones de inversión\n• Información sobre eventos del mercado',
        flags: MessageFlags.Ephemeral
      });
      break;

    default:
      await btnInteraction.reply({
        content: '❌ Acción no reconocida.',
        flags: MessageFlags.Ephemeral
      });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛒 BUY SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function createBuyConfirmationEmbed(crypto, investmentAmount, tokensToReceive, userBalance) {
  const tierColors = {
    'LEGENDARY': '#FFD700',
    'EPIC': '#9966CC',
    'RARE': '#0099FF',
    'COMMON': '#00FF00'
  };
  
  const tierEmojis = {
    'LEGENDARY': '🏆',
    'EPIC': '⚡',
    'RARE': '💫',
    'COMMON': '🟢'
  };
  
  // Calcular fee
  const buyFeePercent = (config.crypto?.fees?.buyFee || 0.5) / 100;
  const feeAmount = Math.max(investmentAmount * buyFeePercent, config.crypto?.fees?.minFee || 1);
  const netInvestment = investmentAmount - feeAmount;
  const netTokens = netInvestment / crypto.price;
  
  return new EmbedBuilder()
    .setColor(tierColors[crypto.tier] || '#1a1a2e')
    .setTitle('🛒 Confirmar Compra de Cryptocurrency')
    .setDescription(`${tierEmojis[crypto.tier]} **${crypto.name} (${crypto.symbol})**\n${crypto.tier} • ${crypto.personality}`)
    .addFields(
      {
        name: '💰 Total a Pagar',
        value: `**${investmentAmount}** monedas del casino`,
        inline: true
      },
      {
        name: '💸 Fee de Transacción',
        value: `**${feeAmount.toFixed(0)}** monedas (${(buyFeePercent * 100).toFixed(1)}%)`,
        inline: true
      },
      {
        name: '📊 Precio Actual',
        value: `**${formatPrice(crypto.price)}** por token`,
        inline: true
      },
      {
        name: '💲 Inversión Neta',
        value: `**${netInvestment.toFixed(0)}** monedas`,
        inline: true
      },
      {
        name: '🎯 Tokens a Recibir',
        value: `**${netTokens.toFixed(6)}** ${crypto.symbol}`,
        inline: true
      },
      {
        name: '💳 Balance Actual',
        value: `${userBalance} monedas`,
        inline: true
      },
      {
        name: '💳 Balance Después',
        value: `${userBalance - investmentAmount} monedas`,
        inline: true
      },
      {
        name: '⚡ Volatilidad',
        value: `${crypto.volatility} ${getVolatilityIcon(crypto.volatility)}`,
        inline: true
      }
    )
    .setFooter({ text: '⏰ Tienes 1 minuto para confirmar esta transacción' })
    .setTimestamp();
}

async function processBuyTransaction(btnInteraction, cryptoSymbol, investmentAmount, tokensToReceive, crypto) {
  const userId = btnInteraction.user.id;
  
  try {
    // Verificar balance nuevamente (por si cambió)
    const currentBalance = await getUserBalance(userId);
    if (currentBalance < investmentAmount) {
      return await btnInteraction.update({
        embeds: [new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Fondos Insuficientes')
          .setDescription(`Tu balance cambió durante la transacción. Balance actual: **${currentBalance}** monedas.`)
        ],
        components: []
      });
    }
    
    // Obtener precio actual (puede haber cambiado)
    const marketData = marketEngine.getMarketData();
    const currentCrypto = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
    
    // Calcular fee de compra (desde config.yml)
    const buyFeePercent = (config.crypto?.fees?.buyFee || 0.5) / 100;
    const feeAmount = Math.max(investmentAmount * buyFeePercent, config.crypto?.fees?.minFee || 1);
    const netInvestment = investmentAmount - feeAmount;
    const currentTokens = netInvestment / currentCrypto.price;
    
    // Ejecutar transacción
    await updateUserBalance(userId, -investmentAmount); // Deducir monedas (incluye fee)
    await addCryptoToPortfolio(userId, cryptoSymbol, currentTokens, currentCrypto.price);
    await logCryptoTransaction(userId, 'BUY', cryptoSymbol, currentTokens, currentCrypto.price, investmentAmount);
    
  // Aplicar cooldown de trading (esperar a que termine)
  await applyTradingCooldown(userId);
    
    // 🏆 Procesar achievements ANTES de la respuesta
    let unlockedAchievements = [];
    try {
      if (!achievementsManager.db) {
        const { pool } = await import('../db.js');
        await achievementsManager.initialize(pool);
      }

      const achievementResults = [];
      const moneda = config.casino?.moneda || '💰';

      // Check first buy achievement
      const firstBuyResult = await achievementsManager.checkFirstBuy(userId);
      if (firstBuyResult && firstBuyResult.unlocked) achievementResults.push(firstBuyResult);

      // Check day trader achievement
      const dayTraderResult = await achievementsManager.checkDayTrader(userId);
      if (dayTraderResult && dayTraderResult.unlocked) achievementResults.push(dayTraderResult);

      // Check portfolio achievements
      const portfolioResults = await achievementsManager.checkPortfolioAchievements(userId);
      if (portfolioResults && Array.isArray(portfolioResults)) {
        achievementResults.push(...portfolioResults.filter(r => r && typeof r.unlocked !== 'undefined' && r.unlocked));
      }

      // Check perfect timing
      const marketData = marketEngine.getMarketData();
      if (marketData.activeEvents && marketData.activeEvents.length > 0) {
        const timingResult = await achievementsManager.checkPerfectTiming(userId, cryptoSymbol, marketData.activeEvents);
        if (timingResult && timingResult.unlocked) achievementResults.push(timingResult);
      }

      unlockedAchievements = achievementResults.filter(r => r.unlocked);
      
      // Procesar notificaciones (sin bloquear)
      if (unlockedAchievements.length > 0) {
        processAchievementResults(btnInteraction.client, btnInteraction.user, unlockedAchievements, moneda)
          .catch(error => console.error('Error processing achievements:', error));
      }
    } catch (achievementError) {
      console.error('Error processing achievements:', achievementError);
    }
    
    // Crear embed de éxito
    let description = `Has comprado **${currentTokens.toFixed(6)} ${cryptoSymbol}** por **${netInvestment}** monedas`;
    if (unlockedAchievements.length > 0) {
      const achievementNames = unlockedAchievements.map(a => a.achievement.name).join(', ');
      description += `\n\n🏆 **¡Achievement desbloqueado!** ${achievementNames}`;
      description += '\n💌 *Revisa tus mensajes directos para más detalles*';
    }
    
    const successEmbed = new EmbedBuilder()
      .setColor(unlockedAchievements.length > 0 ? '#FFD700' : '#00ff00')
      .setTitle(`✅ Compra Exitosa${unlockedAchievements.length > 0 ? ' 🏆' : ''}`)
      .setDescription(description)
      .addFields(
        {
          name: '💰 Precio de Compra',
          value: `${formatPrice(currentCrypto.price)} por token`,
          inline: true
        },
        {
          name: '💳 Fee de Transacción',
          value: `${feeAmount.toFixed(0)} monedas (${(buyFeePercent * 100).toFixed(1)}%)`,
          inline: true
        },
        {
          name: '💳 Nuevo Balance',
          value: `${currentBalance - investmentAmount} monedas`,
          inline: true
        }
      )
      .setTimestamp();
    
    // Log del comando
    logGamblingCommand('crypto-buy', btnInteraction.user, {
      action: 'Buy Crypto',
      result: `Bought ${currentTokens.toFixed(6)} ${cryptoSymbol}`,
      additional: `Investment: ${investmentAmount} coins, Price: ${formatPrice(currentCrypto.price)}`
    }).catch(err => console.error('Logging error:', err));

    await btnInteraction.update({
      embeds: [successEmbed],
      components: []
    });
    
  } catch (error) {
    console.error('Error processing buy transaction:', error);
    await btnInteraction.update({
      embeds: [new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Error en la Transacción')
        .setDescription('Ocurrió un error al procesar tu compra. Intenta de nuevo.')
      ],
      components: []
    });
  }
}

function getVolatilityIcon(volatility) {
  const icons = {
    'LOW': '🛡️',
    'MEDIUM': '⚖️',
    'HIGH': '⚡',
    'EXTREME': '🌪️',
    'INSANE': '💥'
  };
  return icons[volatility] || '📊';
}

// Funciones de base de datos para crypto
async function addCryptoToPortfolio(userId, symbol, quantity, buyPrice) {
  const { pool } = await import('../db.js');
  
  try {
    // Verificar si ya tiene esta crypto
    const [existing] = await pool.execute(
      'SELECT * FROM crypto_portfolio WHERE user_id = ? AND crypto_id = ?',
      [userId, symbol]
    );
    
    if (existing.length > 0) {
      // Actualizar holding existente (promedio ponderado del precio)
      const currentAmount = parseFloat(existing[0].amount);
      const currentAvgPrice = parseFloat(existing[0].avg_buy_price);
      const newAmount = currentAmount + quantity;
      const newAvgPrice = ((currentAmount * currentAvgPrice) + (quantity * buyPrice)) / newAmount;
      
      await pool.execute(
        'UPDATE crypto_portfolio SET amount = ?, avg_buy_price = ?, total_invested = total_invested + ?, last_activity = NOW() WHERE user_id = ? AND crypto_id = ?',
        [newAmount, newAvgPrice, (quantity * buyPrice), userId, symbol]
      );
    } else {
      // Crear nuevo holding
      await pool.execute(
        'INSERT INTO crypto_portfolio (user_id, crypto_id, amount, avg_buy_price, total_invested, first_purchase, last_activity) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, symbol, quantity, buyPrice, (quantity * buyPrice)]
      );
    }
  } catch (error) {
    console.error('Error adding crypto to portfolio:', error);
    throw error;
  }
}

async function logCryptoTransaction(userId, type, symbol, quantity, price, totalValue) {
  const { pool } = await import('../db.js');
  
  try {
    // Generar hash único para la transacción
    const transactionHash = `${Date.now()}_${userId}_${symbol}_${type}`.substring(0, 64);
    
    await pool.execute(
      'INSERT INTO crypto_transactions (user_id, crypto_id, transaction_type, amount, price_per_coin, total_value, transaction_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, symbol, type, quantity, price, totalValue, transactionHash]
    );
  } catch (error) {
    console.error('Error logging crypto transaction:', error);
    // No throw - logging shouldn't break the main transaction
  }
}

// ═══════════════════════════════════════════════════════════════
// 💰 SELL SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getUserCryptoHolding(userId, cryptoSymbol) {
  const { pool } = await import('../db.js');
  
  try {
    const [holdings] = await pool.execute(
      'SELECT * FROM crypto_portfolio WHERE user_id = ? AND crypto_id = ?',
      [userId, cryptoSymbol]
    );
    
    if (holdings.length > 0) {
      const holding = holdings[0];
      // Convertir valores numéricos de la DB
      holding.amount = parseFloat(holding.amount);
      holding.avg_buy_price = parseFloat(holding.avg_buy_price);
      holding.total_invested = parseFloat(holding.total_invested);
      holding.total_realized_gains = parseFloat(holding.total_realized_gains);
      return holding;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user crypto holding:', error);
    throw error;
  }
}

function createSellConfirmationEmbed(crypto, tokensToSell, saleValue, userHolding, profitLoss, isSellingAll) {
  const tierColors = {
    'LEGENDARY': '#FFD700',
    'EPIC': '#9966CC',
    'RARE': '#0099FF',
    'COMMON': '#00FF00'
  };
  
  const tierEmojis = {
    'LEGENDARY': '🏆',
    'EPIC': '⚡',
    'RARE': '💫',
    'COMMON': '🟢'
  };
  
  // Calcular fee
  const sellFeePercent = (config.crypto?.fees?.sellFee || 0.75) / 100;
  const grossSaleValue = tokensToSell * crypto.price;
  const feeAmount = Math.max(grossSaleValue * sellFeePercent, config.crypto?.fees?.minFee || 1);
  const netSaleValue = grossSaleValue - feeAmount;
  
  const profitColor = profitLoss >= 0 ? '🟢' : '🔴';
  const profitText = profitLoss >= 0 ? `+${profitLoss.toFixed(2)}` : `${profitLoss.toFixed(2)}`;
  
  const embed = new EmbedBuilder()
    .setColor(tierColors[crypto.tier] || '#1a1a2e')
    .setTitle('💰 Confirmar Venta de Cryptocurrency')
    .setDescription(`${tierEmojis[crypto.tier]} **${crypto.name} (${crypto.symbol})**\n${crypto.tier} • ${crypto.personality}`)
    .addFields(
      {
        name: '📊 Tokens a Vender',
        value: `**${tokensToSell.toFixed(6)}** ${crypto.symbol}${isSellingAll ? ' (TODO)' : ''}`,
        inline: true
      },
      {
        name: '💰 Precio Actual',
        value: `**${formatPrice(crypto.price)}** por token`,
        inline: true
      },
      {
        name: '💵 Valor Bruto',
        value: `**${Math.floor(grossSaleValue)}** monedas`,
        inline: true
      },
      {
        name: '💸 Fee de Transacción',
        value: `**${feeAmount.toFixed(0)}** monedas (${(sellFeePercent * 100).toFixed(1)}%)`,
        inline: true
      },
      {
        name: '💰 Recibirás',
        value: `**${Math.floor(netSaleValue)}** monedas`,
        inline: true
      },
      {
        name: '📈 Precio de Compra',
        value: `${formatPrice(userHolding.avg_buy_price)} por token`,
        inline: true
      },
      {
        name: '💹 P&L por Token',
        value: `${profitColor} **${profitText}** monedas`,
        inline: true
      },
      {
        name: '📦 Holdings Restantes',
        value: `${(userHolding.amount - tokensToSell).toFixed(6)} ${crypto.symbol}`,
        inline: true
      }
    )
    .setFooter({ text: '⏰ Tienes 1 minuto para confirmar esta transacción' })
    .setTimestamp();
  
  return embed;
}

async function processSellTransaction(btnInteraction, cryptoSymbol, tokensToSell, saleValue, crypto, userHolding, isSellingAll) {
  const userId = btnInteraction.user.id;
  
  try {
    // Verificar holdings nuevamente (por si cambió)
    const currentHolding = await getUserCryptoHolding(userId, cryptoSymbol);
    if (!currentHolding || currentHolding.amount < tokensToSell) {
      return await btnInteraction.update({
        embeds: [new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Holdings Insuficientes')
          .setDescription(`Tus holdings cambiaron durante la transacción. Holdings actuales: **${currentHolding?.amount?.toFixed(6) || 0} ${cryptoSymbol}**.`)
        ],
        components: []
      });
    }
    
    // Obtener precio actual (puede haber cambiado)
    const marketData = marketEngine.getMarketData();
    const currentCrypto = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
    const grossSaleValue = tokensToSell * currentCrypto.price;
    
    // Calcular fee de venta (desde config.yml)
    const sellFeePercent = (config.crypto?.fees?.sellFee || 0.75) / 100;
    const feeAmount = Math.max(grossSaleValue * sellFeePercent, config.crypto?.fees?.minFee || 1);
    const currentSaleValue = grossSaleValue - feeAmount;
    
    // Calcular ganancias realizadas
    const realizedGains = (currentCrypto.price - userHolding.avg_buy_price) * tokensToSell;
    
    // Ejecutar transacción
    await updateUserBalance(userId, Math.floor(currentSaleValue)); // Agregar monedas netas
    await removeCryptoFromPortfolio(userId, cryptoSymbol, tokensToSell, realizedGains);
    await logCryptoTransaction(userId, 'SELL', cryptoSymbol, tokensToSell, currentCrypto.price, currentSaleValue);
    
  // Aplicar cooldown de trading (esperar a que termine)
  await applyTradingCooldown(userId);
    
    // 🏆 Procesar achievements ANTES de la respuesta
    let unlockedAchievements = [];
    try {
      if (!achievementsManager.db) {
        const { pool } = await import('../db.js');
        await achievementsManager.initialize(pool);
      }

      const achievementResults = [];
      const moneda = config.casino?.moneda || '💰';

      // Check day trader achievement (las ventas también cuentan como trades)
      const dayTraderResult = await achievementsManager.checkDayTrader(userId);
      if (dayTraderResult && dayTraderResult.unlocked) achievementResults.push(dayTraderResult);

      // Check portfolio achievements (puede haber perdido whale status)
      const portfolioResults = await achievementsManager.checkPortfolioAchievements(userId);
      if (portfolioResults && Array.isArray(portfolioResults)) {
        achievementResults.push(...portfolioResults.filter(r => r && typeof r.unlocked !== 'undefined' && r.unlocked));
      }

      unlockedAchievements = achievementResults.filter(r => r && r.unlocked);
      
      // Procesar notificaciones (sin bloquear)
      if (unlockedAchievements.length > 0) {
        processAchievementResults(btnInteraction.client, btnInteraction.user, unlockedAchievements, moneda)
          .catch(error => console.error('Error processing achievements:', error));
      }
    } catch (achievementError) {
      console.error('Error processing achievements:', achievementError);
    }
    
    // Crear embed de éxito
    const profitColor = realizedGains >= 0 ? '#00ff00' : '#ff6b6b';
    const profitIcon = realizedGains >= 0 ? '📈' : '📉';
    const profitText = realizedGains >= 0 ? `+${realizedGains.toFixed(2)}` : `${realizedGains.toFixed(2)}`;
    
    let description = `Has vendido **${tokensToSell.toFixed(6)} ${cryptoSymbol}** por **${Math.floor(currentSaleValue)}** monedas netas`;
    if (unlockedAchievements.length > 0) {
      const achievementNames = unlockedAchievements.map(a => a.achievement.name).join(', ');
      description += `\n\n🏆 **¡Achievement desbloqueado!** ${achievementNames}`;
      description += '\n💌 *Revisa tus mensajes directos para más detalles*';
    }
    
    const successEmbed = new EmbedBuilder()
      .setColor(unlockedAchievements.length > 0 ? '#FFD700' : profitColor)
      .setTitle(`✅ Venta Exitosa${unlockedAchievements.length > 0 ? ' 🏆' : ''}`)
      .setDescription(description)
      .addFields(
        {
          name: '💰 Precio de Venta',
          value: `${formatPrice(currentCrypto.price)} por token`,
          inline: true
        },
        {
          name: '💸 Fee de Transacción',
          value: `${feeAmount.toFixed(0)} monedas (${(sellFeePercent * 100).toFixed(1)}%)`,
          inline: true
        },
        {
          name: `${profitIcon} Ganancias/Pérdidas`,
          value: `**${profitText}** monedas`,
          inline: true
        }
      )
      .setTimestamp();
    
    // Log del comando
    logGamblingCommand('crypto-sell', btnInteraction.user, {
      action: 'Sell Crypto',
      result: `Sold ${tokensToSell.toFixed(6)} ${cryptoSymbol}`,
      additional: `Sale Value: ${Math.floor(currentSaleValue)} coins, P&L: ${profitText}`
    }).catch(err => console.error('Logging error:', err));

    await btnInteraction.update({
      embeds: [successEmbed],
      components: []
    });
    
  } catch (error) {
    console.error('Error processing sell transaction:', error);
    await btnInteraction.update({
      embeds: [new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Error en la Transacción')
        .setDescription('Ocurrió un error al procesar tu venta. Intenta de nuevo.')
      ],
      components: []
    });
  }
}

async function removeCryptoFromPortfolio(userId, cryptoSymbol, tokensToSell, realizedGains) {
  const { pool } = await import('../db.js');
  
  try {
    // Obtener holding actual
    const [currentHolding] = await pool.execute(
      'SELECT * FROM crypto_portfolio WHERE user_id = ? AND crypto_id = ?',
      [userId, cryptoSymbol]
    );
    
    if (currentHolding.length === 0) {
      throw new Error('Holding not found');
    }
    
    const holding = currentHolding[0];
    const newAmount = holding.amount - tokensToSell;
    
    if (newAmount <= 0.00000001) {
      // Si vende todo, eliminar el holding
      await pool.execute(
        'DELETE FROM crypto_portfolio WHERE user_id = ? AND crypto_id = ?',
        [userId, cryptoSymbol]
      );
    } else {
      // Actualizar holding restante
      await pool.execute(
        'UPDATE crypto_portfolio SET amount = ?, total_realized_gains = total_realized_gains + ?, last_activity = NOW() WHERE user_id = ? AND crypto_id = ?',
        [newAmount, realizedGains, userId, cryptoSymbol]
      );
    }
  } catch (error) {
    console.error('Error removing crypto from portfolio:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 PORTFOLIO SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function handlePortfolioCommand(interaction) {
  const userId = interaction.user.id;
  
  try {
    // Obtener todos los holdings del usuario
    const userPortfolio = await getUserPortfolio(userId);
    
    if (!userPortfolio || userPortfolio.length === 0) {
      return await interaction.reply({
        content: '📭 **Portfolio Vacío**\n\nAún no tienes inversiones en crypto.\n\n*Usa `/crypto buy` para empezar a invertir en el Casino Metaverse Exchange.*',
        flags: MessageFlags.Ephemeral
      });
    }
    
    // Obtener datos del mercado para precios actuales
    const marketData = marketEngine.getMarketData();
    
    // Calcular P&L para cada holding
    const portfolioWithPL = await calculatePortfolioPL(userPortfolio, marketData.cryptos);
    
    // Crear embed del portfolio
    const portfolioEmbed = createPortfolioEmbed(portfolioWithPL);
    
    // Crear botones de acción
    const portfolioButtons = createPortfolioButtons();
    
    const response = await interaction.reply({
      embeds: [portfolioEmbed],
      components: [portfolioButtons]
    });
    
    // Collector para los botones del portfolio
    const filter = (btnInteraction) => btnInteraction.user.id === userId;
    const collector = response.createMessageComponentCollector({
      filter,
      time: 300000 // 5 minutos
    });
    
    collector.on('collect', async (btnInteraction) => {
      try {
        await handlePortfolioButton(btnInteraction, userId);
      } catch (error) {
        console.error('Error handling portfolio button:', error);
        await btnInteraction.reply({
          content: '❌ Error al procesar la acción. Intenta de nuevo.',
          flags: MessageFlags.Ephemeral
        });
      }
    });
    
    // Log del comando
    logGamblingCommand(interaction.user, 'crypto-portfolio', {
      action: 'Portfolio View',
      result: `Viewed portfolio with ${userPortfolio.length} holdings`,
      additional: `Total Holdings: ${portfolioWithPL.totalValue.toFixed(0)} coins`
    }).catch(err => console.error('Logging error:', err));
    
  } catch (error) {
    console.error('Error in portfolio command:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error al cargar el portfolio. Intenta de nuevo.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function getUserPortfolio(userId) {
  const { pool } = await import('../db.js');
  
  try {
    const [portfolio] = await pool.execute(
      'SELECT * FROM crypto_portfolio WHERE user_id = ? AND amount > 0',
      [userId]
    );
    
    // Convertir valores numéricos
    return portfolio.map(holding => ({
      ...holding,
      amount: parseFloat(holding.amount),
      avg_buy_price: parseFloat(holding.avg_buy_price),
      total_invested: parseFloat(holding.total_invested),
      total_realized_gains: parseFloat(holding.total_realized_gains)
    }));
  } catch (error) {
    console.error('Error fetching user portfolio:', error);
    throw error;
  }
}

async function calculatePortfolioPL(userPortfolio, marketCryptos) {
  let totalValue = 0;
  let totalInvested = 0;
  let totalRealizedGains = 0;
  
  const holdings = userPortfolio.map(holding => {
    // Encontrar crypto actual en el mercado (crypto_id almacena el symbol)
    const currentCrypto = marketCryptos.find(c => c.id === holding.crypto_id || c.symbol === holding.crypto_id);
    
    if (!currentCrypto) {
      console.log(`⚠️ Crypto not found in market: ${holding.crypto_id} (available: ${marketCryptos.map(c => c.id).join(', ')})`);
      return null; // Skip si no se encuentra la crypto
    }
    
    const currentValue = holding.amount * currentCrypto.price;
    const unrealizedPL = (currentCrypto.price - holding.avg_buy_price) * holding.amount;
    const unrealizedPLPercent = ((currentCrypto.price - holding.avg_buy_price) / holding.avg_buy_price) * 100;
    
    totalValue += currentValue;
    totalInvested += holding.total_invested;
    totalRealizedGains += holding.total_realized_gains;
    
    return {
      ...holding,
      crypto: currentCrypto,
      currentValue,
      unrealizedPL,
      unrealizedPLPercent
    };
  }).filter(Boolean); // Filtrar nulls
  
  const totalPL = (totalValue - totalInvested) + totalRealizedGains;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  
  // Encontrar mejor y peor performer
  let bestPerformer = null;
  let worstPerformer = null;
  
  holdings.forEach(holding => {
    if (!bestPerformer || holding.unrealizedPLPercent > bestPerformer.unrealizedPLPercent) {
      bestPerformer = holding;
    }
    if (!worstPerformer || holding.unrealizedPLPercent < worstPerformer.unrealizedPLPercent) {
      worstPerformer = holding;
    }
  });
  
  return {
    holdings,
    totalValue,
    totalInvested,
    totalRealizedGains,
    totalPL,
    totalPLPercent,
    bestPerformer,
    worstPerformer
  };
}

function createPortfolioEmbed(portfolioData) {
  const { holdings, totalValue, totalInvested, totalPL, totalPLPercent, bestPerformer } = portfolioData;
  
  // Determinar color del embed basado en P&L total
  const embedColor = totalPL >= 0 ? '#00ff00' : '#ff6b6b';
  const plIcon = totalPL >= 0 ? '📈' : '📉';
  const plText = totalPL >= 0 ? `+${totalPL.toFixed(2)}` : `${totalPL.toFixed(2)}`;
  const plPercentText = totalPLPercent >= 0 ? `+${totalPLPercent.toFixed(1)}%` : `${totalPLPercent.toFixed(1)}%`;
  
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle('📊 Tu Crypto Portfolio')
    .setDescription(`🏛️ **Casino Metaverse Exchange** • ${holdings.length} posiciones activas\n*Precios y P&L actualizados en tiempo real*`)
    .setTimestamp();
  
  // Determinar layout: si hay 4+ cryptos, usar formato compacto
  if (holdings.length >= 4) {
    // Layout compacto para muchas cryptos
    let portfolioText = '';
    holdings.forEach((holding, index) => {
      const { crypto, amount, currentValue, unrealizedPL, unrealizedPLPercent } = holding;
      
      const tierEmojis = {
        'LEGENDARY': '🏆',
        'EPIC': '⚡', 
        'RARE': '💫',
        'COMMON': '🟢'
      };
      
      const plEmoji = unrealizedPL >= 0 ? '🟢' : '🔴';
      const plSign = unrealizedPL >= 0 ? '+' : '';
      
      portfolioText += `${tierEmojis[crypto.tier]} **${crypto.symbol}** • ${amount.toFixed(4)} tokens • **${Math.floor(currentValue)}** monedas\n${plEmoji} **${plSign}${unrealizedPL.toFixed(0)}** (${plSign}${unrealizedPLPercent.toFixed(1)}%)\n\n`;
    });
    
    embed.addFields({
      name: '💼 Tus Posiciones',
      value: portfolioText.trim(),
      inline: false
    });
  } else {
    // Layout expandido para pocas cryptos
    holdings.forEach(holding => {
      const { crypto, amount, currentValue, unrealizedPL, unrealizedPLPercent } = holding;
      
      const tierEmojis = {
        'LEGENDARY': '🏆',
        'EPIC': '⚡',
        'RARE': '💫',
        'COMMON': '🟢'
      };
      
      const plEmoji = unrealizedPL >= 0 ? '🟢' : '🔴';
      const plSignText = unrealizedPL >= 0 ? '+' : '';
      
      embed.addFields({
        name: `${tierEmojis[crypto.tier]} ${crypto.symbol} - ${crypto.name}`,
        value: `📦 **${amount.toFixed(6)}** tokens\n💰 **${Math.floor(currentValue)}** monedas\n${plEmoji} **${plSignText}${unrealizedPL.toFixed(2)}** (${plSignText}${unrealizedPLPercent.toFixed(1)}%)`,
        inline: true
      });
    });
  }
  
  // Agregar resumen total con más detalles
  embed.addFields(
    {
      name: '� Resumen del Portfolio',
      value: `💰 **Valor Actual:** ${Math.floor(totalValue)} monedas\n💵 **Total Invertido:** ${Math.floor(totalInvested)} monedas\n${plIcon} **P&L Total:** ${plText} monedas (${plPercentText})\n📊 **Diversificación:** ${holdings.length} cryptos diferentes`,
      inline: false
    }
  );
  
  if (bestPerformer && holdings.length > 1) {
    const worstPerformer = portfolioData.worstPerformer;
    embed.addFields(
      {
        name: '🎯 Mejor Performer',
        value: `${bestPerformer.crypto.symbol}: **${bestPerformer.unrealizedPLPercent >= 0 ? '+' : ''}${bestPerformer.unrealizedPLPercent.toFixed(1)}%**`,
        inline: true
      },
      {
        name: '🔻 Peor Performer', 
        value: `${worstPerformer.crypto.symbol}: **${worstPerformer.unrealizedPLPercent >= 0 ? '+' : ''}${worstPerformer.unrealizedPLPercent.toFixed(1)}%**`,
        inline: true
      }
    );
  }
  
  return embed;
}

function createPortfolioButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('portfolio_refresh')
        .setLabel('🔄 Actualizar')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('portfolio_market')
        .setLabel('📊 Market')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('portfolio_buy')
        .setLabel('🛒 Comprar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('portfolio_sell')
        .setLabel('💰 Vender')
        .setStyle(ButtonStyle.Danger)
    );
}

async function handlePortfolioButton(btnInteraction, userId) {
  const action = btnInteraction.customId;
  
  switch (action) {
    case 'portfolio_refresh':
      // Actualizar portfolio
      const userPortfolio = await getUserPortfolio(userId);
      const marketData = marketEngine.getMarketData();
      const portfolioWithPL = await calculatePortfolioPL(userPortfolio, marketData.cryptos);
      const updatedEmbed = createPortfolioEmbed(portfolioWithPL);
      
      await btnInteraction.update({
        embeds: [updatedEmbed],
        components: [createPortfolioButtons()]
      });
      break;
      
    case 'portfolio_market':
      await btnInteraction.reply({
        content: '📊 **Ir al Market**\n\nUsa `/crypto market` para ver precios actuales y análisis del mercado.',
        flags: MessageFlags.Ephemeral
      });
      break;
      
    case 'portfolio_buy':
      await btnInteraction.reply({
        content: '🛒 **Comprar Más Crypto**\n\nUsa `/crypto buy` para agregar más inversiones a tu portfolio.',
        flags: MessageFlags.Ephemeral
      });
      break;
      
    case 'portfolio_sell':
      await btnInteraction.reply({
        content: '💰 **Vender Holdings**\n\nUsa `/crypto sell` para vender tus cryptocurrencies y realizar ganancias.',
        flags: MessageFlags.Ephemeral
      });
      break;
      
    default:
      await btnInteraction.reply({
        content: '❌ Acción no reconocida.',
        flags: MessageFlags.Ephemeral
      });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🏆 ACHIEVEMENTS COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleAchievementsCommand(interaction) {
  const userId = interaction.user.id;
  const moneda = config.casino?.moneda || '💰';

  try {
    await interaction.deferReply();

    // Inicializar achievements manager si es necesario
    if (!achievementsManager.db) {
      const { pool } = await import('../db.js');
      await achievementsManager.initialize(pool);
    }

    // Obtener estadísticas del usuario
    const userStats = await achievementsManager.getUserAchievementStats(userId);
    const userHistory = await achievementsManager.getUserAchievementHistory(userId, 8);
    const achievements = await achievementsManager.getUserAchievements(userId);
    
    if (userHistory.length === 0 && achievements.length === 0) {
      // Usuario nuevo - mostrar achievements disponibles
      const embed = new EmbedBuilder()
        .setTitle('🏆 Sistema de Achievements Crypto')
        .setColor('#3498DB')
        .setDescription(`**${interaction.user.username}**, ¡aún no tienes achievements!\n\n**Comienza a hacer trading para desbloquear logros:**`)
        .addFields(
          { name: '🥇 First Steps', value: 'Haz tu primera compra de crypto', inline: true },
          { name: '📈 Day Trader', value: 'Completa 10+ trades en un día', inline: true },
          { name: '🐋 Whale Status', value: 'Portfolio de 100,000+ monedas', inline: true },
          { name: '⏰ Perfect Timing', value: 'Compra durante un crash del mercado', inline: true },
          { name: '💎 Diamond Hands', value: 'Mantén una posición por 7+ días', inline: true },
          { name: '🎯 Portfolio Master', value: 'Posee las 4 cryptomonedas', inline: true }
        )
        .setFooter({ text: 'Usa /crypto market para comenzar a hacer trading' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      // Crear embed con historial y estadísticas
      const embed = new EmbedBuilder()
        .setTitle(`🏆 Achievements de ${interaction.user.username}`)
        .setColor('#FFD700')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(`**Resumen de logros desbloqueados**\n\n📊 **Estadísticas:**`)
        .addFields(
          {
            name: '🎯 Total Achievements',
            value: `${userStats.total_achievements}`,
            inline: true
          },
          {
            name: '💰 Recompensas Ganadas',
            value: `${Math.floor(userStats.total_rewards_earned || 0)} ${moneda}`,
            inline: true
          },
          {
            name: '📅 Primer Logro',
            value: userStats.first_achievement ? 
              `<t:${Math.floor(new Date(userStats.first_achievement).getTime() / 1000)}:R>` : 
              'N/A',
            inline: true
          }
        );

      if (userHistory.length > 0) {
        let historyText = '';
        userHistory.forEach((achievement, index) => {
          const timestamp = Math.floor(new Date(achievement.unlocked_at).getTime() / 1000);
          historyText += `🏆 **${achievement.achievement_name}**\n`;
          historyText += `💰 +${Math.floor(achievement.reward_amount)} ${moneda} • <t:${timestamp}:R>\n`;
          if (index < userHistory.length - 1) historyText += '\n';
        });

        embed.addFields({
          name: '📜 Historial Reciente',
          value: historyText || 'No hay historial disponible',
          inline: false
        });
      }

      // Mostrar progreso actual si hay achievements en progreso
      if (achievements.length > 0) {
        const inProgress = achievements.filter(a => !a.is_completed);
        if (inProgress.length > 0) {
          let progressText = '';
          inProgress.slice(0, 3).forEach(achievement => {
            const progress = achievement.progress_current || 0;
            const required = achievement.progress_required;
            const percentage = Math.min((progress / required) * 100, 100);
            const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
            
            progressText += `**${achievement.achievement_name}**\n`;
            progressText += `${progressBar} ${Math.floor(percentage)}% (${progress}/${required})\n\n`;
          });

          embed.addFields({
            name: '📈 En Progreso',
            value: progressText || 'Todos los achievements completados',
            inline: false
          });
        }
      }

      embed.setFooter({ text: 'Continúa haciendo trading para desbloquear más achievements' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }

    // Log del comando
    logGamblingCommand(interaction.user, 'crypto-achievements', {
      action: 'View Achievements',
      result: `Viewed ${achievements.length} achievements`,
      additional: `Completed: ${achievements.filter(a => a.is_completed).length}`
    }).catch(err => console.error('Logging error:', err));

  } catch (error) {
    console.error('Error in achievements command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('❌ Error')
      .setDescription('Hubo un error al cargar tus achievements. Inténtalo de nuevo.')
      .setTimestamp();

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 AUTO-REFRESH SYSTEM
// ═══════════════════════════════════════════════════════════════

function setupAutoRefresh(message) {
  try {
    // Limpiar cualquier interval previo para este mensaje
    if (activeMarketMessages.has(message.id)) {
      clearInterval(activeMarketMessages.get(message.id).interval);
    }

    // Crear nuevo interval
    const interval = setInterval(async () => {
      try {
        // Verificar si el mensaje todavía existe y es reciente (menos de 10 minutos)
        const messageAge = Date.now() - message.createdTimestamp;
        if (messageAge > 600000) { // 10 minutos
          clearAutoRefresh(message.id);
          return;
        }

        // Obtener datos actualizados del mercado
        const marketData = marketEngine.getMarketData();
        
        if (!marketData.cryptos || marketData.cryptos.length === 0) {
          return; // No actualizar si no hay datos
        }

        // Crear embed actualizado
        const updatedEmbed = createMarketEmbed(marketData);
        const buttons = createMarketButtons();

        // Actualizar el mensaje de forma segura
        await message.edit({
          embeds: [updatedEmbed],
          components: [buttons]
        }).catch(() => {
          // Si falla la edición, limpiar el interval
          clearAutoRefresh(message.id);
        });

      } catch (error) {
        console.error('Error during auto-refresh:', error);
        clearAutoRefresh(message.id);
      }
    }, 30000); // 30 segundos

    // Guardar referencia
    activeMarketMessages.set(message.id, { interval, message });

    // Limpiar automáticamente después de 10 minutos
    setTimeout(() => {
      clearAutoRefresh(message.id);
    }, 600000); // 10 minutos

  } catch (error) {
    console.error('Error setting up auto-refresh:', error);
  }
}

function clearAutoRefresh(messageId) {
  try {
    if (activeMarketMessages.has(messageId)) {
      const { interval } = activeMarketMessages.get(messageId);
      clearInterval(interval);
      activeMarketMessages.delete(messageId);
    }
  } catch (error) {
    console.error('Error clearing auto-refresh:', error);
  }
}

// Exportar función para uso externo
export { createMarketEmbed };