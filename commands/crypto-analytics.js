// ═══════════════════════════════════════════════════════════════
// 📊 CRYPTO ANALYTICS COMMAND
// ═══════════════════════════════════════════════════════════════

import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import marketEngine from '../util/crypto/marketEngine.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logGamblingCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('crypto-analytics')
  .setDescription('📊 Advanced crypto analytics and technical analysis')
  .addStringOption(option =>
    option.setName('crypto')
      .setDescription('Select cryptocurrency to analyze')
      .setRequired(true)
      .addChoices(
        { name: '🟠 Bitcoin (BTC)', value: 'BTC' },
        { name: '💙 Ethereum (ETH)', value: 'ETH' },
        { name: '🟡 Binance Coin (BNB)', value: 'BNB' },
        { name: '💜 Solana (SOL)', value: 'SOL' }
      ))
  .addStringOption(option =>
    option.setName('analysis')
      .setDescription('Type of analysis')
      .addChoices(
        { name: '📈 Technical Indicators', value: 'indicators' },
        { name: '📊 Advanced Charts (ASCII)', value: 'chart' },
        { name: '🌐 Web Charts & Links', value: 'charts-web' },
        { name: '🔮 Trend Prediction', value: 'prediction' },
        { name: '🎯 Trading Signals', value: 'signals' },
        { name: '📋 Complete Analysis', value: 'complete' }
      ));

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const cryptoSymbol = interaction.options.getString('crypto');
    const analysisType = interaction.options.getString('analysis') || 'complete';

    // Get market data
    const marketData = marketEngine.getMarketData();
    const cryptoData = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
    
    if (!cryptoData) {
      return await interaction.editReply({
        content: `❌ No data found for ${cryptoSymbol}. Please try again later.`
      });
    }

    // Get technical analysis from market engine
    const technicalAnalysis = marketEngine.getTechnicalAnalysis();
    
    if (!technicalAnalysis) {
      return await interaction.editReply({
        content: '❌ Technical analysis system not available. Please try again later.'
      });
    }

    // Initialize price history if needed (simulation)
    await initializePriceHistory(cryptoSymbol, technicalAnalysis);

    // Generate analysis based on type
    let embed;
    switch (analysisType) {
      case 'indicators':
        embed = await createIndicatorsEmbed(cryptoData, technicalAnalysis);
        break;
      case 'chart':
        embed = await createChartEmbed(cryptoData, technicalAnalysis);
        break;
      case 'charts-web':
        embed = await createWebChartsEmbed(cryptoData, technicalAnalysis);
        break;
      case 'prediction':
        embed = await createPredictionEmbed(cryptoData, technicalAnalysis);
        break;
      case 'signals':
        embed = await createSignalsEmbed(cryptoData, technicalAnalysis);
        break;
      default:
        embed = await createCompleteAnalysisEmbed(cryptoData, technicalAnalysis);
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in crypto analytics:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Error generating analytics. Please try again later.'
      });
    } else {
      
  // Log gambling command
  await logGamblingCommand(interaction.user, 'crypto-analytics', {
    action: 'executed'
  });

  await interaction.reply({
        content: '❌ Error generating analytics. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 EMBED CREATORS
// ═══════════════════════════════════════════════════════════════

async function createIndicatorsEmbed(cryptoData, technicalAnalysis) {
  const analysis = technicalAnalysis.getAnalyticsSummary(cryptoData.id);
  const rsi = technicalAnalysis.calculateRSI(cryptoData.id);
  const macd = technicalAnalysis.calculateMACD(cryptoData.id);
  const bollinger = technicalAnalysis.calculateBollingerBands(cryptoData.id);
  const sma20 = technicalAnalysis.calculateSMA(cryptoData.id, 20);
  const sma50 = technicalAnalysis.calculateSMA(cryptoData.id, 50);

  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle(`📊 Technical Indicators - ${cryptoData.name} (${cryptoData.symbol})`)
    .setDescription(`**Current Price:** $${cryptoData.price?.toLocaleString() || 'N/A'}`)
    .addFields(
      {
        name: '📈 Moving Averages',
        value: `\`\`\`\nSMA 20: $${sma20?.toFixed(2) || 'N/A'}\nSMA 50: $${sma50?.toFixed(2) || 'N/A'}\nTrend: ${sma20 > sma50 ? '🟢 Bullish' : '🔴 Bearish'}\`\`\``,
        inline: true
      },
      {
        name: '⚡ RSI (14)',
        value: `\`\`\`\nRSI: ${Math.round(rsi)}\nStatus: ${getRSIStatus(rsi)}\nSignal: ${getRSISignal(rsi)}\`\`\``,
        inline: true
      },
      {
        name: '📊 MACD',
        value: macd ? `\`\`\`\nMACD: ${macd.macd.toFixed(4)}\nSignal: ${macd.signal.toFixed(4)}\nHistogram: ${macd.histogram.toFixed(4)}\`\`\`` : '`No data`',
        inline: true
      }
    );

  if (bollinger) {
    embed.addFields({
      name: '🎯 Bollinger Bands',
      value: `\`\`\`\nUpper: $${bollinger.upper.toFixed(2)}\nMiddle: $${bollinger.middle.toFixed(2)}\nLower: $${bollinger.lower.toFixed(2)}\nPosition: ${getBollingerPosition(cryptoData.price, bollinger)}\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ text: '📊 Technical Analysis • Real-time indicators' })
    .setTimestamp();

  return embed;
}

async function createChartEmbed(cryptoData, technicalAnalysis) {
  const chart = technicalAnalysis.generateASCIIChart(cryptoData.id, 30, 8);
  const history = technicalAnalysis.getPriceHistory(cryptoData.id, 20);
  
  let priceChange = 0;
  if (history.length >= 2) {
    const latest = history[history.length - 1].price;
    const previous = history[0].price;
    priceChange = ((latest - previous) / previous * 100);
  }

  const embed = new EmbedBuilder()
    .setTitle(`📈 ${cryptoData.name} (${cryptoData.symbol}) - Advanced Charts`)
    .setColor('#00D4AA')
    .setTimestamp();

  // ASCII Charts with different types (reduced size)
  const cleanLineChart = technicalAnalysis.generateASCIIChart(cryptoData.id, 35, 8, 'clean-line');
  const candlestickChart = technicalAnalysis.generateASCIIChart(cryptoData.id, 25, 6, 'candlestick');

  embed.addFields(
    {
      name: '� Clean Line Chart',
      value: `\`\`\`\n${cleanLineChart.substring(0, 900)}\`\`\``,
      inline: false
    },
    {
      name: '🕯️ Candlestick Chart',
      value: `\`\`\`\n${candlestickChart.substring(0, 800)}\`\`\``,
      inline: false
    }
  );

  // Web Chart Links
  const tradingViewUrl = technicalAnalysis.generateWebChartURL(cryptoData.id);
  const quickChartUrl = technicalAnalysis.generateQuickChartURL(cryptoData.id);
  const coinGeckoUrl = technicalAnalysis.generateCoinGeckoChart(cryptoData.id);

  embed.addFields(
    {
      name: '🌐 Charts',
      value: `[📈 TradingView](${tradingViewUrl})`,
      inline: true
    },
    {
      name: '💰 Stats',
      value: `**$${cryptoData.price.toFixed(2)}**\n${cryptoData.change24h >= 0 ? '+' : ''}${cryptoData.change24h.toFixed(2)}%`,
      inline: true
    }
  );

  return embed;
}

async function createWebChartsEmbed(cryptoData, technicalAnalysis) {
  const embed = new EmbedBuilder()
    .setTitle(`🌐 ${cryptoData.name} (${cryptoData.symbol}) - Web Charts & Analysis`)
    .setColor('#e74c3c')
    .setDescription(`**Current Price:** $${cryptoData.price?.toLocaleString() || 'N/A'}`)
    .setTimestamp();

  // Generate simple chart URLs only
  const tradingViewUrl = technicalAnalysis.generateWebChartURL(cryptoData.id);
  const coinGeckoUrl = technicalAnalysis.generateCoinGeckoChart(cryptoData.id);

  embed.addFields(
    {
      name: '📈 TradingView',
      value: `[Chart](${tradingViewUrl})`,
      inline: true
    },
    {
      name: '� CoinGecko', 
      value: `[Analysis](${coinGeckoUrl})`,
      inline: true
    },
    {
      name: '� Price',
      value: `$${cryptoData.price.toFixed(2)}`,
      inline: true
    }
  );

  // Add current market stats
  const stats = technicalAnalysis.getAnalyticsSummary(cryptoData.id);
  if (stats) {
    embed.addFields(
      {
        name: '📊 Quick Stats',
        value: `**Price:** $${cryptoData.price.toFixed(2)}\n` +
               `**24h Change:** ${cryptoData.change24h >= 0 ? '📈 +' : '📉 '}${cryptoData.change24h.toFixed(2)}%\n` +
               `**Volatility:** ${stats.volatility || 'Medium'}\n` +
               `**Trend:** ${stats.trend || 'Neutral'}`,
        inline: true
      },
      {
        name: '🎯 Quick Indicators',
        value: `**RSI:** ${technicalAnalysis.calculateRSI(cryptoData.id)?.toFixed(1) || 'N/A'}\n` +
               `**Signal:** ${technicalAnalysis.getMarketSignal(cryptoData.id)?.signal || 'NEUTRAL'}\n` +
               `**Support:** $${(cryptoData.price * 0.95).toFixed(2)}\n` +
               `**Resistance:** $${(cryptoData.price * 1.05).toFixed(2)}`,
        inline: true
      }
    );
  }

  embed.setFooter({ 
    text: '💡 Tip: Use TradingView for professional analysis • Charts update in real-time' 
  });

  return embed;
}

async function createPredictionEmbed(cryptoData, technicalAnalysis) {
  const prediction = technicalAnalysis.predictTrend(cryptoData.id);
  const signal = technicalAnalysis.getMarketSignal(cryptoData.id);
  
  const embed = new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle(`🔮 Trend Prediction - ${cryptoData.name} (${cryptoData.symbol})`)
    .setDescription(`**Current Price:** $${cryptoData.price?.toLocaleString() || 'N/A'}`);

  if (prediction) {
    const trendIcon = prediction.direction === 'UP' ? '📈' : prediction.direction === 'DOWN' ? '📉' : '➡️';
    const confidenceColor = prediction.confidence > 70 ? '🟢' : prediction.confidence > 40 ? '🟡' : '🔴';
    
    embed.addFields(
      {
        name: '🎯 Trend Analysis',
        value: `\`\`\`\nDirection: ${trendIcon} ${prediction.direction}\nStrength: ${prediction.strength.toFixed(1)}%\nConfidence: ${confidenceColor} ${prediction.confidence.toFixed(0)}%\`\`\``,
        inline: true
      },
      {
        name: '📊 Next Price Prediction',
        value: `\`\`\`\nPredicted: $${prediction.nextPrice?.toFixed(2) || 'N/A'}\nChange: ${((prediction.nextPrice - cryptoData.price) / cryptoData.price * 100).toFixed(2)}%\`\`\``,
        inline: true
      }
    );

    // Show 5-period prediction
    if (prediction.predictions && prediction.predictions.length > 0) {
      const predictionText = prediction.predictions
        .slice(0, 5)
        .map((price, index) => `P${index + 1}: $${price.toFixed(2)}`)
        .join('\n');
      
      embed.addFields({
        name: '🔮 5-Period Forecast',
        value: `\`\`\`\n${predictionText}\`\`\``,
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '⚠️ Insufficient Data',
      value: 'Need more price history for accurate predictions.',
      inline: false
    });
  }

  embed.setFooter({ text: '🔮 Trend Prediction • Based on linear regression' })
    .setTimestamp();

  return embed;
}

async function createSignalsEmbed(cryptoData, technicalAnalysis) {
  const signal = technicalAnalysis.getMarketSignal(cryptoData.id);
  
  const embed = new EmbedBuilder()
    .setColor(getSignalColor(signal.recommendation))
    .setTitle(`🎯 Trading Signals - ${cryptoData.name} (${cryptoData.symbol})`)
    .setDescription(`**Current Price:** $${cryptoData.price?.toLocaleString() || 'N/A'}`);

  embed.addFields(
    {
      name: '🚀 Recommendation',
      value: `\`\`\`\n${getSignalIcon(signal.recommendation)} ${signal.recommendation}\nConfidence: ${signal.confidence}%\nTrend: ${signal.trend}\`\`\``,
      inline: true
    },
    {
      name: '📊 Signal Strength',
      value: `\`\`\`\nStrength: ${signal.strength}\nRSI: ${signal.rsi}\n${getStrengthBar(signal.strength)}\`\`\``,
      inline: true
    }
  );

  if (signal.signals && signal.signals.length > 0) {
    const signalsText = signal.signals.slice(0, 6).join('\n• ');
    embed.addFields({
      name: '🔍 Analysis Details',
      value: `• ${signalsText}`,
      inline: false
    });
  }

  embed.setFooter({ text: '🎯 Trading Signals • Not financial advice' })
    .setTimestamp();

  return embed;
}

async function createCompleteAnalysisEmbed(cryptoData, technicalAnalysis) {
  const analysis = technicalAnalysis.getAnalyticsSummary(cryptoData.id);
  const signal = technicalAnalysis.getMarketSignal(cryptoData.id);
  const prediction = technicalAnalysis.predictTrend(cryptoData.id);
  
  const embed = new EmbedBuilder()
    .setColor('#34495e')
    .setTitle(`📋 Complete Analysis - ${cryptoData.name} (${cryptoData.symbol})`)
    .setDescription(
      `**Current Price:** $${cryptoData.price?.toLocaleString() || 'N/A'}\n` +
      `**24h Change:** ${cryptoData.change24h >= 0 ? '+' : ''}${cryptoData.change24h?.toFixed(2) || 0}%`
    );

  // Add advanced chart (smaller size)
  const cleanChart = technicalAnalysis.generateASCIIChart(cryptoData.id, 30, 6, 'clean-line');
  embed.addFields({
    name: '📈 Price Chart',
    value: `\`\`\`\n${cleanChart.substring(0, 900)}\`\`\``,
    inline: false
  });

  // Technical Indicators Summary
  embed.addFields(
    {
      name: '📊 Key Indicators',
      value: `\`\`\`\nRSI: ${signal.rsi} ${getRSIStatus(signal.rsi)}\nSMA20: $${analysis.indicators.sma20?.toFixed(2) || 'N/A'}\nTrend: ${signal.trend}\`\`\``,
      inline: true
    },
    {
      name: '🎯 Trading Signal',
      value: `\`\`\`\n${getSignalIcon(signal.recommendation)} ${signal.recommendation}\nConfidence: ${signal.confidence}%\n${getStrengthBar(signal.strength, 5)}\`\`\``,
      inline: true
    }
  );

  // Prediction Summary
  if (prediction) {
    const trendIcon = prediction.direction === 'UP' ? '📈' : prediction.direction === 'DOWN' ? '📉' : '➡️';
    embed.addFields({
      name: '🔮 Prediction',
      value: `\`\`\`\n${trendIcon} ${prediction.direction}\nNext: $${prediction.nextPrice?.toFixed(2) || 'N/A'}\nConfidence: ${prediction.confidence.toFixed(0)}%\`\`\``,
      inline: true
    });
  }

  // Add Web Charts Section
  const tradingViewUrl = technicalAnalysis.generateWebChartURL(cryptoData.id);
  
  embed.addFields({
    name: '🌐 Charts',
    value: `[📈 TradingView](${tradingViewUrl})`,
    inline: false
  });

  embed.setFooter({ text: '📋 Complete Technical Analysis • Click links for detailed charts • Not financial advice' })
    .setTimestamp();

  return embed;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function initializePriceHistory(cryptoSymbol, technicalAnalysis) {
  // Simulate price history for demonstration
  const marketData = marketEngine.getMarketData();
  const crypto = marketData.cryptos.find(c => c.symbol === cryptoSymbol);
  
  if (!crypto) return;

  // Add current price
  technicalAnalysis.addPricePoint(crypto.id, crypto.price);
  
  // Simulate historical data for better analysis
  if (technicalAnalysis.getPriceHistory(crypto.id).length < 50) {
    const basePrice = crypto.price;
    for (let i = 50; i >= 1; i--) {
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const historicalPrice = basePrice * (1 + change * i * 0.1);
      technicalAnalysis.addPricePoint(crypto.id, historicalPrice);
    }
  }
}

function getRSIStatus(rsi) {
  if (rsi < 30) return '🟢 Oversold';
  if (rsi > 70) return '🔴 Overbought';
  return '🟡 Neutral';
}

function getRSISignal(rsi) {
  if (rsi < 30) return 'Buy Signal';
  if (rsi > 70) return 'Sell Signal';
  return 'Hold';
}

function getBollingerPosition(price, bollinger) {
  if (price > bollinger.upper) return '🔴 Above Upper Band';
  if (price < bollinger.lower) return '🟢 Below Lower Band';
  return '🟡 Within Bands';
}

function getSignalColor(recommendation) {
  switch (recommendation) {
    case 'STRONG BUY': return '#27ae60';
    case 'BUY': return '#2ecc71';
    case 'STRONG SELL': return '#c0392b';
    case 'SELL': return '#e74c3c';
    default: return '#f39c12';
  }
}

function getSignalIcon(recommendation) {
  switch (recommendation) {
    case 'STRONG BUY': return '🚀';
    case 'BUY': return '📈';
    case 'STRONG SELL': return '📉';
    case 'SELL': return '⬇️';
    default: return '⏸️';
  }
}

function getStrengthBar(strength, length = 8) {
  const normalizedStrength = Math.max(-5, Math.min(5, strength));
  const position = Math.round((normalizedStrength + 5) / 10 * length);
  
  let bar = '';
  for (let i = 0; i < length; i++) {
    if (i === position) {
      bar += '█';
    } else {
      bar += '░';
    }
  }
  
  return bar;
}

export default { data, execute };