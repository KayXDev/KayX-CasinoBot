// ═══════════════════════════════════════════════════════════════
// 📰 CRYPTO NEWS & ALERTS ENGINE
// ═══════════════════════════════════════════════════════════════

import { EmbedBuilder } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

class CryptoNewsEngine {
  constructor() {
    this.client = null;
    this.db = null;
    this.marketEngine = null;
    this.lastPrices = new Map(); // Para comparar cambios de precio
    this.lastNewsTime = Date.now();
    this.sentAlerts = new Set(); // Para evitar spam de alertas
    this.lastAlertTimestamps = new Map(); // Controlar intervalo mínimo entre alertas por cripto
    this.newsInterval = null;
    this.alertsInterval = null;
    
    // 🚦 SISTEMA DE RATE LIMITING PARA ALERTAS
    this.messageQueue = []; // Cola de mensajes pendientes
    this.isProcessingQueue = false;
    this.RATE_LIMIT_DELAY = 1200; // 1.2 segundos entre mensajes (50 mensajes por minuto)
    this.MAX_QUEUE_SIZE = 20; // Máximo 20 alertas en cola
  }

  // Inicializar el sistema
  async initialize(client, database, marketEngine) {
    this.client = client;
    this.db = database;
    this.marketEngine = marketEngine;
    
    // Configurar intervalos si está habilitado
    if (config.crypto?.news_alerts?.enabled) {
      await this.startNewsGeneration();
      await this.startPriceAlerts();
      console.log('📰 Crypto News & Alerts system initialized');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // � SISTEMA DE RATE LIMITING
  // ═══════════════════════════════════════════════════════════════

  async addToMessageQueue(channel, content, priority = 'normal') {
    // Verificar tamaño de la cola
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      console.log('⚠️ Cola de alertas llena, descartando mensaje más antiguo');
      this.messageQueue.shift(); // Remover el más antiguo
    }

    // Agregar mensaje a la cola
    const message = {
      channel,
      content,
      priority,
      timestamp: Date.now()
    };

    // Insertar según prioridad
    if (priority === 'high') {
      this.messageQueue.unshift(message); // Al principio
    } else {
      this.messageQueue.push(message); // Al final
    }

    // Iniciar procesamiento si no está activo
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  async processMessageQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      try {
        await message.channel.send(message.content);
        // console.log(`📤 Alerta enviada (${this.messageQueue.length} pendientes)`);
      } catch (error) {
        console.error('Error enviando alerta:', error);
        
        // Si es rate limit, volver a poner el mensaje en la cola y esperar más
        if (error.code === 50035 || error.message.includes('rate limited')) {
          this.messageQueue.unshift(message); // Devolver al inicio
          console.log('⏳ Rate limited, esperando 5 segundos extra...');
          await this.sleep(5000);
        }
      }

      // Delay entre mensajes para respetar rate limits
      if (this.messageQueue.length > 0) {
        await this.sleep(this.RATE_LIMIT_DELAY);
      }
    }

    this.isProcessingQueue = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════
  // �🔄 SISTEMA DE MONITOREO CONTINUO
  // ═══════════════════════════════════════════════════════════════

  async startNewsGeneration() {
    const frequency = (config.crypto?.news_alerts?.news_generation?.frequency_minutes || 45) * 60 * 1000;
    
    this.newsInterval = setInterval(async () => {
      try {
        await this.generateAutomaticNews();
      } catch (error) {
        console.error('Error generating automatic news:', error);
      }
    }, frequency);
  }

  async startPriceAlerts() {
    const frequency = (config.crypto?.news_alerts?.price_alerts?.check_frequency_seconds || 60) * 1000;
    
    this.alertsInterval = setInterval(async () => {
      try {
        await this.checkPriceAlerts();
      } catch (error) {
        console.error('Error checking price alerts:', error);
      }
    }, frequency);
  }

  // ═══════════════════════════════════════════════════════════════
  // 📰 GENERACIÓN DE NOTICIAS
  // ═══════════════════════════════════════════════════════════════

  async generateAutomaticNews() {
    if (!config.crypto?.news_alerts?.news_generation?.enabled) return;
    
    // Verificar que el marketEngine esté disponible
    if (!this.marketEngine || typeof this.marketEngine.getMarketData !== 'function') {
      console.warn('⚠️ Market engine not available for news generation');
      return;
    }
    
    const marketData = this.marketEngine.getMarketData();
    const cryptos = marketData.cryptos || [];
    
    // Analizar cambios de precio significativos
    const priceChanges = this.analyzePriceChanges(cryptos);
    
    // Generar noticias basadas en cambios
    if (priceChanges.significantChanges.length > 0) {
      await this.createPriceChangeNews(priceChanges);
    }
    
    // Generar noticias basadas en eventos activos
    if (marketData.activeEvents && marketData.activeEvents.length > 0) {
      await this.createEventNews(marketData.activeEvents);
    }
    
    // Actualizar precios para próxima comparación
    this.updateLastPrices(cryptos);
  }

  analyzePriceChanges(cryptos) {
    const changes = [];
    const minChangePercent = config.crypto?.news_alerts?.news_generation?.min_price_change_percent || 8.0;
    
    cryptos.forEach(crypto => {
      const validCrypto = this.validateCrypto(crypto);
      if (!validCrypto) return;

      const lastPrice = this.lastPrices.get(validCrypto.id);
      if (lastPrice && lastPrice > 0) {
        const changePercent = ((validCrypto.price - lastPrice) / lastPrice) * 100;
        
        if (Math.abs(changePercent) >= minChangePercent) {
          changes.push({
            crypto: validCrypto,
            oldPrice: lastPrice,
            newPrice: validCrypto.price,
            changePercent: changePercent,
            direction: changePercent > 0 ? 'up' : 'down'
          });
        }
      }
    });
    
    // Detectar movimientos del mercado general
    const marketSentiment = this.calculateMarketSentiment(cryptos);
    
    return {
      significantChanges: changes,
      marketSentiment: marketSentiment,
      isMarketCrash: changes.filter(c => c.direction === 'down').length >= 3,
      isMarketPump: changes.filter(c => c.direction === 'up').length >= 3
    };
  }

  async createPriceChangeNews(priceChanges) {
    const newsChannel = await this.getNewsChannel();
    if (!newsChannel) return;
    
    const { significantChanges, isMarketCrash, isMarketPump, marketSentiment } = priceChanges;
    
    // Noticia de mercado general si hay movimiento masivo
    if (isMarketCrash || isMarketPump) {
      const avgChange = significantChanges.reduce((sum, c) => sum + c.changePercent, 0) / significantChanges.length;
      const template = isMarketCrash ? 'market_crash' : 'market_pump';
      const news = await this.createNewsEmbed(template, {
        percentage: Math.abs(avgChange).toFixed(1),
        timeframe: this.getTimeframeSinceLastNews(),
        sentiment: marketSentiment
      });
      
      // Usar cola de mensajes para evitar rate limiting
      await this.addToMessageQueue(newsChannel, { embeds: [news] }, 'normal');
    } else {
      // Noticias individuales para cada crypto con cambio significativo
      for (const change of significantChanges.slice(0, 2)) { // Máximo 2 noticias individuales
        const template = change.direction === 'up' ? 'single_crypto_pump' : 'single_crypto_crash';
        const news = await this.createNewsEmbed(template, {
          crypto_name: `${change.crypto.name} (${change.crypto.symbol})`,
          percentage: Math.abs(change.changePercent).toFixed(1),
          timeframe: this.getTimeframeSinceLastNews(),
          old_price: change.oldPrice.toFixed(8),
          new_price: change.newPrice.toFixed(8)
        });
        
        await newsChannel.send({ embeds: [news] });
      }
    }
    
    this.lastNewsTime = Date.now();
  }

  async createEventNews(activeEvents) {
    const newsChannel = await this.getNewsChannel();
    if (!newsChannel) return;
    
    // Crear noticias para eventos activos que no hemos cubierto recientemente
    for (const event of activeEvents.slice(0, 1)) { // Una noticia de evento por vez
      const news = await this.createEventNewsEmbed(event);
      await newsChannel.send({ embeds: [news] });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔔 SISTEMA DE ALERTAS DE PRECIO
  // ═══════════════════════════════════════════════════════════════

  async checkPriceAlerts() {
    if (!config.crypto?.news_alerts?.price_alerts?.enabled) return;
    
    // Verificar que el marketEngine esté disponible
    if (!this.marketEngine || typeof this.marketEngine.getMarketData !== 'function') {
      console.warn('⚠️ Market engine not available for price alerts');
      return;
    }
    
    const marketData = this.marketEngine.getMarketData();
    const cryptos = marketData.cryptos || [];
    
    // Verificar alertas globales predefinidas
    await this.checkGlobalAlerts(cryptos);
    
    // Verificar alertas personalizadas de usuarios
    await this.checkUserAlerts(cryptos);
  }

  // Generador automático de alertas globales para todas las cryptos activas
  async checkGlobalAlerts(cryptos) {
    const now = Date.now();
    const MIN_ALERT_INTERVAL = (config.crypto?.news_alerts?.price_alerts?.min_alert_interval_minutes || 5) * 60 * 1000; // 5 minutos por defecto
    for (const crypto of cryptos) {
      const validCrypto = this.validateCrypto(crypto);
      if (!validCrypto) continue;
      const base = validCrypto.basePrice || validCrypto.price;
      let milestone, crash;
      if (validCrypto.symbol === 'BTC') {
        milestone = base * 1.1; // +10%
        crash = base * 0.9;    // -10%
      } else {
        milestone = base * 2;
        crash = base * 0.5;
      }
      // Milestone
      const milestoneKey = `auto_${validCrypto.symbol}_milestone_${milestone}`;
      const lastMilestone = this.lastAlertTimestamps.get(milestoneKey) || 0;
      if (!this.sentAlerts.has(milestoneKey) && validCrypto.price >= milestone && (now - lastMilestone > MIN_ALERT_INTERVAL)) {
        await this.sendGlobalPriceAlert(validCrypto, {
          type: 'milestone',
          price: milestone,
          message: `🚀 ${validCrypto.name} (${validCrypto.symbol}) ha superado el hito de $${milestone.toLocaleString()}!`,
          icon: validCrypto.emoji || '🚀'
        });
        this.sentAlerts.add(milestoneKey);
        this.lastAlertTimestamps.set(milestoneKey, now);
      }
      // Crash
      const crashKey = `auto_${validCrypto.symbol}_crash_${crash}`;
      const lastCrash = this.lastAlertTimestamps.get(crashKey) || 0;
      if (!this.sentAlerts.has(crashKey) && validCrypto.price <= crash && (now - lastCrash > MIN_ALERT_INTERVAL)) {
        await this.sendGlobalPriceAlert(validCrypto, {
          type: 'crash',
          price: crash,
          message: `⚠️ ${validCrypto.name} (${validCrypto.symbol}) ha caído por debajo de $${crash.toLocaleString()}!`,
          icon: validCrypto.emoji || '⚠️'
        });
        this.sentAlerts.add(crashKey);
        this.lastAlertTimestamps.set(crashKey, now);
      }
    }
  }

  async checkUserAlerts(cryptos) {
    try {
      // Obtener todas las alertas activas de usuarios
      const [userAlerts] = await this.db.execute(`
        SELECT * FROM user_crypto_alerts 
        WHERE is_active = TRUE
      `);

      for (const crypto of cryptos) {
        const validCrypto = this.validateCrypto(crypto);
        if (!validCrypto) continue;

        const cryptoAlerts = userAlerts.filter(alert => alert.crypto_symbol === validCrypto.symbol);
        
        for (const alert of cryptoAlerts) {
          let shouldTrigger = false;
          
          if (alert.alert_type === 'above' && validCrypto.price >= alert.target_price) {
            shouldTrigger = true;
          } else if (alert.alert_type === 'below' && validCrypto.price <= alert.target_price) {
            shouldTrigger = true;
          }
          
          if (shouldTrigger) {
            await this.sendUserPriceAlert(validCrypto, alert);
            
            // Marcar alerta como disparada y desactivarla
            await this.db.execute(`
              UPDATE user_crypto_alerts 
              SET is_active = FALSE, triggered_count = triggered_count + 1, last_triggered = NOW()
              WHERE id = ?
            `, [alert.id]);

            // Guardar en historial
            await this.db.execute(`
              INSERT INTO crypto_alert_history 
              (user_id, crypto_symbol, alert_type, target_price, actual_price, message)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              alert.user_id,
              alert.crypto_symbol,
              alert.alert_type,
              alert.target_price,
              validCrypto.price,
              alert.message
            ]);
          }
        }
      }
    } catch (error) {
      console.error('Error checking user alerts:', error);
    }
  }

  async sendGlobalPriceAlert(crypto, alert) {
    const validCrypto = this.validateCrypto(crypto);
    if (!validCrypto) {
      console.log(`⚠️ Datos de crypto inválidos para alerta global: ${crypto?.symbol || 'unknown'}`);
      return;
    }

    const alertsChannel = await this.getAlertsChannel();
    if (!alertsChannel) return;

    // Color dinámico según tipo de alerta
    const color = alert.type === 'milestone' ? '#00e676' : '#ff1744';
    // Icono de la cripto
    const cryptoIcon = validCrypto.emoji || '💹';
    // Miniatura de la cripto (puedes mejorar la URL si tienes imágenes)
    const thumbUrl = `https://cryptoicons.org/api/icon/${validCrypto.symbol.toLowerCase()}/128`;


    // Calcular cambio 1h usando historial
    let change1h = 0;
    if (this.marketEngine && this.marketEngine.getCryptoData) {
      const cryptoData = this.marketEngine.getCryptoData(validCrypto.symbol);
      const history = cryptoData && cryptoData.priceHistory ? cryptoData.priceHistory : [];
      if (history && history.length > 1) {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        let price1hAgo = history[0].price;
        for (let i = 0; i < history.length; i++) {
          const ts = history[i].timestamp instanceof Date ? history[i].timestamp.getTime() : history[i].timestamp;
          if (ts <= oneHourAgo) {
            price1hAgo = history[i].price;
            break;
          }
        }
        change1h = ((cryptoData.current_price - price1hAgo) / price1hAgo) * 100;
      }
    }

    // --- EMBED MODERNO Y VISUAL ---
    const colorModern = change1h > 0 ? 0x00e676 : 0xff1744; // Verde neón o rojo intenso
    const upDownEmoji = change1h > 0 ? '🟢📈' : '🔴📉';
    // Buscar tier correctamente: primero en validCrypto, luego en marketEngine.cryptoData
    let tierValue = validCrypto.tier;
    if (!tierValue && this.marketEngine && this.marketEngine.cryptoData) {
      const data = this.marketEngine.cryptoData.get(validCrypto.symbol);
      if (data && data.tier) tierValue = data.tier;
    }
    const tier = tierValue ? `🏅 ${tierValue}` : '🏅 Sin tier';
    const price = `💰 **$${validCrypto.price.toLocaleString()}**`;
    const change = `${upDownEmoji} **${change1h > 0 ? '+' : ''}${change1h.toFixed(2)}%** (1h)`;
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const infoBlock = [
      `${price}   |   ${change}`,
      divider,
      `${tier}`
    ].join('\n');
    const timeBlock = `🕒 <t:${Math.floor(Date.now()/1000)}:R>`;

    const embed = new EmbedBuilder()
      .setTitle(`✨ ${validCrypto.name} (${validCrypto.symbol})`)
      .setColor(colorModern)
      .setDescription(`> ${alert.message}`)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png')
      .addFields(
        {
          name: '📊 Resumen de Mercado',
          value: infoBlock,
          inline: false
        },
        {
          name: '⏰ Última actualización',
          value: timeBlock,
          inline: true
        }
      )
      .setFooter({
        text: 'Casino Bot • Alerta visual premium',
        iconURL: 'https://i.imgur.com/hMwxvcd.png'
      })
      .setTimestamp();

    // Usar cola de mensajes para evitar rate limiting
    await this.addToMessageQueue(alertsChannel, { embeds: [embed] }, 'normal');
  }

  async sendUserPriceAlert(crypto, alert) {
    try {
      const validCrypto = this.validateCrypto(crypto);
      if (!validCrypto) {
        console.log(`⚠️ Datos de crypto inválidos para alerta de usuario: ${crypto?.symbol || 'unknown'}`);
        return;
      }

      const user = await this.client.users.fetch(alert.user_id);
      
      const typeText = alert.alert_type === 'above' ? 'por encima de' : 'por debajo de';
      

      // Usar getCryptoData para obtener historial y datos actuales
      let change1min = 0;
      if (this.marketEngine && this.marketEngine.getCryptoData) {
        const cryptoData = this.marketEngine.getCryptoData(validCrypto.symbol);
        const history = cryptoData && cryptoData.priceHistory ? cryptoData.priceHistory : [];
        if (history && history.length > 1) {
          const now = Date.now();
          const oneMinAgo = now - 60 * 1000;
          let price1minAgo = history[0].price;
          for (let i = 0; i < history.length; i++) {
            const ts = history[i].timestamp instanceof Date ? history[i].timestamp.getTime() : history[i].timestamp;
            if (ts <= oneMinAgo) {
              price1minAgo = history[i].price;
              break;
            }
          }
          change1min = ((cryptoData.current_price - price1minAgo) / price1minAgo) * 100;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(alert.alert_type === 'above' ? '#00FF00' : '#FF0000')
        .setTitle(`🔔 ¡ALERTA DISPARADA!`)
        .setDescription(`**${validCrypto.name} (${validCrypto.symbol})** alcanzó tu precio objetivo`)
        .addFields(
          {
            name: '🎯 Tu Alerta',
            value: `${validCrypto.symbol} ${typeText} $${alert.target_price}`,
            inline: true
          },
          {
            name: '💰 Precio Actual',
            value: `$${validCrypto.price.toLocaleString()}`,
            inline: true
          },
          {
            name: '📈 Cambio 1min',
            value: `${change1min > 0 ? '+' : ''}${change1min.toFixed(2)}%`,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Personal Price Alert • Esta alerta ha sido desactivada automáticamente' });

      if (alert.message) {
        embed.addFields({
          name: '💬 Tu Mensaje',
          value: `"${alert.message}"`,
          inline: false
        });
      }

      await user.send({ embeds: [embed] });

      console.log(`🔔 User alert sent: ${crypto.symbol} ${alert.alert_type} $${alert.target_price} to user ${alert.user_id}`);
      
    } catch (error) {
      console.error(`Error sending user alert to ${alert.user_id}:`, error);
      // Si no se puede enviar DM al usuario, intentar enviar al canal de alertas
      const alertsChannel = await this.getAlertsChannel();
      if (alertsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Alerta Personal (DM Failed)')
          .setDescription(`<@${alert.user_id}>, tu alerta de ${validCrypto.symbol} se disparó pero no pude enviarte un mensaje directo.`)
          .addFields(
            {
              name: '🎯 Alerta',
              value: `${validCrypto.symbol} ${alert.alert_type === 'above' ? 'por encima de' : 'por debajo de'} $${alert.target_price}`,
              inline: true
            },
            {
              name: '💰 Precio Actual',
              value: `$${validCrypto.price.toLocaleString()}`,
              inline: true
            }
          )
          .setTimestamp();
        
        // Usar cola de mensajes para evitar rate limiting
        await this.addToMessageQueue(alertsChannel, { embeds: [embed] }, 'normal');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 ANÁLISIS DE SENTIMIENTO
  // ═══════════════════════════════════════════════════════════════

  calculateMarketSentiment(cryptos) {
    if (!cryptos || cryptos.length === 0) return 'neutral';
    
    // Calcular cambio promedio de todas las cryptos
    const avgChange = cryptos.reduce((sum, crypto) => sum + (crypto.change24h || 0), 0) / cryptos.length;
    
    const ranges = config.crypto?.news_alerts?.sentiment_analysis?.sentiment_ranges || {};
    
    if (avgChange <= ranges.extreme_fear) return 'extreme_fear';
    if (avgChange <= ranges.fear) return 'fear';  
    if (avgChange <= ranges.neutral) return 'neutral';
    if (avgChange <= ranges.greed) return 'greed';
    return 'extreme_greed';
  }

  getSentimentMessage(sentiment) {
    const messages = config.crypto?.news_alerts?.sentiment_analysis?.sentiment_messages || {};
    return messages[sentiment] || '😐 Sentimiento desconocido';
  }

  getSentimentColor(sentiment) {
    const colors = {
      'extreme_fear': '#8B0000',
      'fear': '#FF4500', 
      'neutral': '#808080',
      'greed': '#32CD32',
      'extreme_greed': '#00FF00'
    };
    return colors[sentiment] || '#808080';
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ FUNCIONES DE UTILIDAD
  // ═══════════════════════════════════════════════════════════════

  // Validar y normalizar datos de crypto
  validateCrypto(crypto) {
    if (!crypto || typeof crypto !== 'object') return null;
    return {
      id: crypto.id || 'unknown',
      name: crypto.name || 'Unknown',
      symbol: crypto.symbol || 'UNK',
      price: typeof crypto.price === 'number' ? crypto.price : 0,
      basePrice: typeof crypto.basePrice === 'number' ? crypto.basePrice : undefined,
      change_24h: typeof crypto.change24h === 'number' ? crypto.change24h : 0,
      change_1h: typeof crypto.change1h === 'number' ? crypto.change1h : 0
    };
  }

  async createNewsEmbed(templateType, data) {
    const templates = config.crypto?.news_alerts?.news_templates?.[templateType] || ['Sin plantilla disponible'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let title = template;
    Object.keys(data).forEach(key => {
      title = title.replace(`{${key}}`, data[key]);
    });
    
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('📰 CRYPTO NEWS')
      .setDescription(`**${title}**`)
      .setTimestamp()
      .setFooter({ text: 'Crypto News Engine • Live Market Updates' });
    
    // Añadir análisis de sentimiento si está disponible
    if (data.sentiment) {
      const sentimentMsg = this.getSentimentMessage(data.sentiment);
      embed.addFields({
        name: '📊 Sentimiento del Mercado',
        value: sentimentMsg,
        inline: false
      });
      
      embed.setColor(this.getSentimentColor(data.sentiment));
    }
    
    return embed;
  }

  async createEventNewsEmbed(event) {
    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('⚡ EVENTO DE MERCADO')
      .setDescription(`**${event.title}**\n\n${event.description}`)
      .addFields(
        {
          name: '💥 Impacto',
          value: `${event.price_impact_min}% a ${event.price_impact_max}%`,
          inline: true
        },
        {
          name: '⏱️ Duración',
          value: `${event.duration_minutes} minutos`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Market Event Alert • Live Trading Impact' });
    
    if (event.affected_cryptos) {
      embed.addFields({
        name: '🎯 Cryptos Afectadas',
        value: event.affected_cryptos.join(', '),
        inline: false
      });
    }
    
    return embed;
  }

  updateLastPrices(cryptos) {
    cryptos.forEach(crypto => {
      const validCrypto = this.validateCrypto(crypto);
      if (validCrypto && validCrypto.price > 0) {
        this.lastPrices.set(validCrypto.id, validCrypto.price);
      }
    });
  }

  getTimeframeSinceLastNews() {
    const minutes = Math.floor((Date.now() - this.lastNewsTime) / 60000);
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    return `${hours} horas`;
  }

  async getNewsChannel() {
    const channelId = config.crypto?.news_alerts?.channels?.news_channel;
    if (!channelId || channelId === "PON_AQUI_EL_ID_DEL_CANAL_NOTICIAS") return null;
    
    try {
      return await this.client.channels.fetch(channelId);
    } catch (error) {
      console.error('Error fetching news channel:', error);
      return null;
    }
  }

  async getAlertsChannel() {
    const channelId = config.crypto?.news_alerts?.channels?.alerts_channel;
    if (!channelId || channelId === "PON_AQUI_EL_ID_DEL_CANAL_ALERTAS") return null;
    
    try {
      return await this.client.channels.fetch(channelId);
    } catch (error) {
      console.error('Error fetching alerts channel:', error);
      return null;
    }
  }

  // Función para detener los intervalos cuando sea necesario
  stop() {
    if (this.newsInterval) {
      clearInterval(this.newsInterval);
      this.newsInterval = null;
    }
    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);  
      this.alertsInterval = null;
    }
  }
}

// Instancia singleton
const newsEngine = new CryptoNewsEngine();

export default newsEngine;