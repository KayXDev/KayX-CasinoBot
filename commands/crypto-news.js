// ═══════════════════════════════════════════════════════════════
// 📰 CRYPTO NEWS & ALERTS COMMANDS
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import newsEngine from '../util/crypto/newsEngine.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logGamblingCommand } from '../util/selectiveLogging.js';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('crypto-news')
  .setDescription('📰 Sistema de noticias y alertas crypto')
  .addSubcommand(subcommand =>
    subcommand
      .setName('latest')
      .setDescription('Ver las últimas noticias del mercado crypto')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('sentiment')
      .setDescription('Ver el análisis de sentimiento actual del mercado')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('alerts')
      .setDescription('Gestionar tus alertas de precio')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Acción a realizar')
          .setRequired(true)
          .addChoices(
            { name: 'Ver mis alertas', value: 'list' },
            { name: 'Crear nueva alerta', value: 'create' },
            { name: 'Eliminar alerta', value: 'delete' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('create-alert')
      .setDescription('Crear una nueva alerta de precio')
      .addStringOption(option =>
        option
          .setName('crypto')
          .setDescription('Criptomoneda para la alerta')
          .setRequired(true)
          .addChoices(
            { name: 'Bitcoin (BTC)', value: 'BTC' },
            { name: 'Ethereum (ETH)', value: 'ETH' },
            { name: 'Binance Coin (BNB)', value: 'BNB' },
            { name: 'Solana (SOL)', value: 'SOL' }
          )
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Tipo de alerta')
          .setRequired(true)
          .addChoices(
            { name: 'Precio por encima de', value: 'above' },
            { name: 'Precio por debajo de', value: 'below' }
          )
      )
      .addNumberOption(option =>
        option
          .setName('price')
          .setDescription('Precio objetivo para la alerta')
          .setRequired(true)
          .setMinValue(0.01)
      )
      .addStringOption(option =>
        option
          .setName('message')
          .setDescription('Mensaje personalizado para la alerta (opcional)')
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const moneda = config.casino?.moneda || '💰';

  try {
    switch (subcommand) {
      case 'latest':
        await handleLatestNews(interaction, moneda);
        break;
      case 'sentiment':
        await handleSentimentAnalysis(interaction, moneda);
        break;
      case 'alerts':
        await handleAlertsManagement(interaction, moneda);
        break;
      case 'create-alert':
        await handleCreateAlert(interaction, moneda);
        break;
    }

  } catch (error) {
    console.error('Error in crypto news command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('❌ Error')
      .setDescription('Hubo un error al ejecutar el comando de noticias.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      
  // Log gambling command
  await logGamblingCommand(interaction.user, 'crypto-news', {
    action: 'executed'
  });

  await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleLatestNews(interaction, moneda) {
  await interaction.deferReply();

  // Inicializar market engine si es necesario
  const marketEngine = (await import('../util/crypto/marketEngine.js')).default;
  if (!marketEngine.db) {
    const { pool } = await import('../db.js');
    await marketEngine.initialize(pool);
  }

  const marketData = marketEngine.getMarketData();
  const cryptos = marketData.cryptos || [];

  if (cryptos.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('📰 Noticias Crypto')
      .setDescription('No hay datos del mercado disponibles en este momento.')
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [embed] });
  }

  // Analizar mercado actual para generar "noticias"
  const sentiment = newsEngine.calculateMarketSentiment(cryptos);
  const sentimentMsg = newsEngine.getSentimentMessage(sentiment);
  const sentimentColor = newsEngine.getSentimentColor(sentiment);

  const embed = new EmbedBuilder()
    .setColor(sentimentColor)
    .setTitle('📰 Crypto Market News')
    .setDescription('**Últimas actualizaciones del mercado de criptomonedas**')
    .addFields(
      {
        name: '📊 Sentimiento del Mercado',
        value: sentimentMsg,
        inline: false
      }
    )
    .setTimestamp();

  // Añadir información de precios actuales
  let marketSummary = '';
  cryptos.forEach(crypto => {
    if (!crypto || typeof crypto.symbol !== 'string') return; // Skip invalid cryptos
    
    const change24h = crypto.change24h || 0;
    const price = crypto.price || 0;
    const changeIcon = change24h >= 0 ? '📈' : '📉';
    const changeColor = change24h >= 0 ? '+' : '';
    marketSummary += `${changeIcon} **${crypto.symbol}**: $${price.toLocaleString()} (${changeColor}${change24h.toFixed(2)}%)\n`;
  });

  embed.addFields({
    name: '💹 Precios Actuales',
    value: marketSummary,
    inline: false
  });

  // Añadir eventos activos si los hay
  if (marketData.activeEvents && marketData.activeEvents.length > 0) {
    let eventsText = '';
    marketData.activeEvents.forEach(event => {
      eventsText += `⚡ **${event.title}**\n${event.description}\n\n`;
    });

    embed.addFields({
      name: '🔥 Eventos Activos',
      value: eventsText || 'No hay eventos activos',
      inline: false
    });
  }

  embed.setFooter({ text: 'Live Market Data • Actualizado cada minuto' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSentimentAnalysis(interaction, moneda) {
  await interaction.deferReply();

  const marketEngine = (await import('../util/crypto/marketEngine.js')).default;
  const marketData = marketEngine.getMarketData();
  const cryptos = marketData.cryptos || [];

  // Safety check for empty cryptos array
  if (cryptos.length === 0) {
    return await interaction.editReply({ 
      content: '❌ No hay datos de mercado disponibles en este momento. Intenta de nuevo más tarde.',
      flags: MessageFlags.Ephemeral 
    });
  }

  const sentiment = newsEngine.calculateMarketSentiment(cryptos);
  const sentimentMsg = newsEngine.getSentimentMessage(sentiment);
  const sentimentColor = newsEngine.getSentimentColor(sentiment);

  // Calcular estadísticas detalladas
  const avgChange = cryptos.reduce((sum, crypto) => sum + (crypto.change24h || 0), 0) / cryptos.length;
  const positiveCount = cryptos.filter(c => (c.change24h || 0) > 0).length;
  const negativeCount = cryptos.filter(c => (c.change24h || 0) < 0).length;

  const embed = new EmbedBuilder()
    .setColor(sentimentColor)
    .setTitle('📊 Análisis de Sentimiento del Mercado')
    .setDescription(`**${sentimentMsg}**\n\nAnálisis completo del estado emocional del mercado crypto`)
    .addFields(
      {
        name: '📈 Estadísticas Generales',
        value: `📊 Cambio promedio 24h: **${avgChange.toFixed(2)}%**\n` +
               `🟢 Cryptos en positivo: **${positiveCount}/${cryptos.length}**\n` +
               `🔴 Cryptos en negativo: **${negativeCount}/${cryptos.length}**`,
        inline: false
      }
    )
    .setTimestamp();

  // Análisis por crypto individual
  let cryptoAnalysis = '';
  cryptos.forEach(crypto => {
    if (!crypto || typeof crypto.symbol !== 'string') return; // Skip invalid cryptos
    
    const change24h = crypto.change24h || 0;
    let cryptoSentiment = '';
    if (change24h > 8) cryptoSentiment = '🚀 Extrema euforia';
    else if (change24h > 3) cryptoSentiment = '📈 Optimismo';
    else if (change24h > -3) cryptoSentiment = '😐 Neutral';
    else if (change24h > -8) cryptoSentiment = '📉 Pesimismo';
    else cryptoSentiment = '💥 Pánico';

    cryptoAnalysis += `**${crypto.symbol}**: ${cryptoSentiment} (${change24h.toFixed(2)}%)\n`;
  });

  embed.addFields({
    name: '🎯 Análisis Individual',
    value: cryptoAnalysis,
    inline: false
  });

  // Recomendación basada en sentimiento
  let recommendation = '';
  switch (sentiment) {
    case 'extreme_fear':
      recommendation = '💡 **Estrategia**: Oportunidad de compra - "Be greedy when others are fearful"';
      break;
    case 'fear':
      recommendation = '💡 **Estrategia**: Considerar acumulación gradual - DCA recomendado';
      break;
    case 'neutral':
      recommendation = '💡 **Estrategia**: Mantener posiciones - Mercado sin dirección clara';
      break;
    case 'greed':
      recommendation = '💡 **Estrategia**: Cuidado con FOMO - Considerar tomar ganancias';
      break;
    case 'extreme_greed':
      recommendation = '💡 **Estrategia**: Zona de peligro - Posible corrección inminente';
      break;
  }

  embed.addFields({
    name: '🎲 Recomendación Estratégica',
    value: recommendation,
    inline: false
  });

  embed.setFooter({ text: 'Sentiment Analysis • No es consejo financiero' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleAlertsManagement(interaction, moneda) {
  const action = interaction.options.getString('action');
  const userId = interaction.user.id;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { pool } = await import('../db.js');

  switch (action) {
    case 'list':
      await showUserAlerts(interaction, userId, pool, moneda);
      break;
    case 'create':
      await showCreateAlertDialog(interaction);
      break;
    case 'delete':
      await showDeleteAlertDialog(interaction, userId, pool);
      break;
  }
}

async function showUserAlerts(interaction, userId, pool, moneda) {
  try {
    const [alerts] = await pool.execute(
      'SELECT * FROM user_crypto_alerts WHERE user_id = ? AND is_active = TRUE ORDER BY created_at DESC',
      [userId]
    );

    if (alerts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('🔔 Tus Alertas de Precio')
        .setDescription('No tienes alertas configuradas.\n\nUsa `/crypto-news create-alert` para crear una nueva alerta.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🔔 Tus Alertas de Precio')
      .setDescription(`Tienes **${alerts.length}** alertas activas:\n`)
      .setTimestamp();

    let alertsList = '';
    alerts.forEach((alert, index) => {
      const typeText = alert.alert_type === 'above' ? 'por encima de' : 'por debajo de';
      alertsList += `**${index + 1}.** ${alert.crypto_symbol} ${typeText} $${alert.target_price}\n`;
      if (alert.message) alertsList += `   💬 "${alert.message}"\n`;
      alertsList += `   📅 Creada: <t:${Math.floor(new Date(alert.created_at).getTime() / 1000)}:R>\n\n`;
    });

    embed.addFields({
      name: '📋 Lista de Alertas',
      value: alertsList,
      inline: false
    });

    embed.setFooter({ text: 'Las alertas se envían automáticamente cuando se alcanzan los precios' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error showing user alerts:', error);
    throw error;
  }
}

async function handleCreateAlert(interaction, moneda) {
  const crypto = interaction.options.getString('crypto');
  const type = interaction.options.getString('type');
  const price = interaction.options.getNumber('price');
  const message = interaction.options.getString('message');
  const userId = interaction.user.id;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const { pool } = await import('../db.js');

    // Verificar límite de alertas por usuario (máximo 10)
    const [existingAlerts] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_crypto_alerts WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (existingAlerts[0].count >= 10) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Límite de Alertas')
        .setDescription('Has alcanzado el límite máximo de 10 alertas activas.\n\nElimina algunas alertas antes de crear nuevas.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Crear la nueva alerta
    await pool.execute(`
      INSERT INTO user_crypto_alerts (user_id, crypto_symbol, alert_type, target_price, message)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, crypto, type, price, message]);

    const typeText = type === 'above' ? 'por encima de' : 'por debajo de';
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alerta Creada')
      .setDescription(`Tu alerta ha sido configurada exitosamente:`)
      .addFields(
        {
          name: '🎯 Configuración',
          value: `**${crypto}** ${typeText} **$${price.toLocaleString()}**`,
          inline: false
        }
      )
      .setTimestamp();

    if (message) {
      embed.addFields({
        name: '💬 Mensaje Personalizado',
        value: `"${message}"`,
        inline: false
      });
    }

    embed.addFields({
      name: '🔔 ¿Qué sigue?',
      value: 'Recibirás una notificación automática cuando el precio alcance tu objetivo.\n\nPuedes ver todas tus alertas con `/crypto-news alerts list`',
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error creating alert:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription('Hubo un error al crear tu alerta. Inténtalo de nuevo.')
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}