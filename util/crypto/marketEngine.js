// ═══════════════════════════════════════════════════════════════
// 🚀 CASINO METAVERSE EXCHANGE - MARKET ENGINE
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import yaml from 'js-yaml';
import fs from 'fs';

// Cargar configuración desde config.yml
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const cryptoConfig = config.crypto || {};

// Configuración del motor de mercado (desde config.yml)
const MARKET_CONFIG = {
  // Intervalos de actualización
  PRICE_UPDATE_INTERVAL: cryptoConfig.market?.updateInterval || 30000,
  EVENT_CHECK_INTERVAL: cryptoConfig.events?.checkInterval || 300000,
  
  // Parámetros de volatilidad
  VOLATILITY_MULTIPLIERS: {
    LOW: (cryptoConfig.market?.volatilityMultipliers?.LOW || 0.3) / 100,
    MEDIUM: (cryptoConfig.market?.volatilityMultipliers?.MEDIUM || 1.0) / 100,
    HIGH: (cryptoConfig.market?.volatilityMultipliers?.HIGH || 2.5) / 100,
    EXTREME: (cryptoConfig.market?.volatilityMultipliers?.EXTREME || 4.0) / 100,
    INSANE: (cryptoConfig.market?.volatilityMultipliers?.INSANE || 6.0) / 100
  },
  
  // Trading fees (desde config.yml)
  TRADING_FEES: {
    BUY: (cryptoConfig.fees?.buyFee || 0.5) / 100,
    SELL: (cryptoConfig.fees?.sellFee || 0.75) / 100,
    VOLATILITY_MULTIPLIER: cryptoConfig.fees?.volatilityMultiplier || 2.0,
    MIN_FEE: cryptoConfig.fees?.minFee || 1,
    MAX_FEE: cryptoConfig.fees?.maxFee || 1000
  },
  
  // Market dynamics (desde config.yml)
  MARKET_DYNAMICS: {
    VOLATILITY_BASE: (cryptoConfig.market?.volatilityBase || 1.5) / 100,
    MIN_PRICE_PERCENT: cryptoConfig.market?.minPricePercent || 10,
    MAX_PRICE_PERCENT: cryptoConfig.market?.maxPricePercent || 500,
    CRASH_CHANCE: cryptoConfig.market?.crashChance || 0.03,
    CRASH_INTENSITY: (cryptoConfig.market?.crashIntensity || 25) / 100,
    PUMP_CHANCE: cryptoConfig.market?.pumpChance || 0.02,
    PUMP_INTENSITY: (cryptoConfig.market?.pumpIntensity || 40) / 100,
    WHALE_CHANCE: cryptoConfig.market?.whaleChance || 0.01,
    WHALE_IMPACT: (cryptoConfig.market?.whaleImpact || 15) / 100
  },
  
  // Market Schedule Configuration (desde config.yml)
  SCHEDULE: {
    ENABLED: cryptoConfig.schedule?.enabled || false,
    ENABLE_DAILY_HOURS: cryptoConfig.schedule?.enableDailyHours !== false, // true por defecto
    TIMEZONE: cryptoConfig.schedule?.timezone || "UTC",
    DAILY_HOURS: {
      OPEN: cryptoConfig.schedule?.dailyHours?.open || "00:00",
      CLOSE: cryptoConfig.schedule?.dailyHours?.close || "23:59"
    },
    CLOSED_DAYS: cryptoConfig.schedule?.closedDays || [],
    SPECIAL_CLOSED_DATES: cryptoConfig.schedule?.specialClosedDates || [],
    EXTENDED_CLOSURE: cryptoConfig.schedule?.extendedClosure || { enabled: false },
    BEHAVIOR: {
      ALLOW_PRICE_UPDATES: cryptoConfig.schedule?.closedBehavior?.allowPriceUpdates || false,
      ALLOW_VIEWING: cryptoConfig.schedule?.closedBehavior?.allowViewing || true,
      SHOW_NEXT_OPEN: cryptoConfig.schedule?.closedBehavior?.showNextOpen || true,
      PAUSE_EVENTS: cryptoConfig.schedule?.closedBehavior?.pauseEvents || true
    }
  },

  // Personalidades de cryptos (desde config.yml)
  PERSONALITIES: (() => {
    const personalities = {};
    const cryptos = cryptoConfig.cryptocurrencies || cryptoConfig.currencies || {};
    Object.keys(cryptos).forEach(symbol => {
      const crypto = cryptos[symbol];
      personalities[symbol] = {
        baseVolatility: crypto.volatilityMultiplier || 1.0,
        trendFollowing: crypto.trendFollowing || 0.5,
        eventSensitivity: crypto.eventSensitivity || 1.0,
        recoverySpeed: crypto.recoverySpeed || 1.0
      };
    });
    return personalities;
  })()
};

// Estado global del mercado
let marketState = {
  sentiment: 50,        // 0-100 (0=extreme fear, 100=extreme greed)
  volatilityIndex: 50,  // 0-100 
  activeEvents: new Map(),
  priceHistory: new Map(),
  lastUpdate: new Date(),
  isActive: true
};

class MarketEngine {
  // Devuelve el historial completo de precios (con timestamps) para una cripto
  getPriceHistory(cryptoId) {
    return marketState.priceHistory.get(cryptoId) || [];
  }
  constructor() {
    this.db = null;
    this.updateInterval = null;
    this.eventInterval = null;
    this.cryptoData = new Map();
  }

  // Inicializar el motor
  async initialize() {
    const { pool } = await import('../../db.js');
    this.db = pool;
    
    // Cargar datos iniciales de cryptos
    await this.loadCryptoData();
    
    // Inicializar historial de precios
    await this.initializePriceHistory();

    // Inicializar sistema de achievements
    try {
      const achievementsManager = (await import('./achievementsManager.js')).default;
      await achievementsManager.initialize(pool);
      console.log('🏆 Achievements system initialized');
    } catch (error) {
      console.error('Error initializing achievements system:', error);
    }

    // Inicializar sistema de análisis técnico
    try {
      const TechnicalAnalysis = (await import('./technicalAnalysis.js')).default;
      this.technicalAnalysis = new TechnicalAnalysis();
      console.log('📊 Technical Analysis system initialized');
    } catch (error) {
      console.error('Error initializing technical analysis system:', error);
    }
    
    // Comenzar loops de actualización
    this.startMarketUpdates();
    
    console.log('🚀 Market Engine initialized successfully');
  }

  // ═══════════════════════════════════════════════════════════════
  // 🕐 MARKET SCHEDULE FUNCTIONS (Funciones de Horarios de Mercado)
  // ═══════════════════════════════════════════════════════════════

  // Verificar si el mercado está abierto actualmente
  isMarketOpen(currentTime = new Date()) {
    if (!MARKET_CONFIG.SCHEDULE.ENABLED) return true;

    // Convertir a la zona horaria configurada estrictamente
    const timeInZone = new Date(currentTime.toLocaleString("en-US", {timeZone: MARKET_CONFIG.SCHEDULE.TIMEZONE}));

    // Verificar cierre extendido
    if (this.isExtendedClosurePeriod(timeInZone)) {
      return false;
    }

    // Verificar día de la semana
    const dayOfWeek = timeInZone.getDay();
    if (MARKET_CONFIG.SCHEDULE.CLOSED_DAYS.includes(dayOfWeek)) {
      return false;
    }

    // Verificar fechas especiales
    const monthDay = String(timeInZone.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(timeInZone.getDate()).padStart(2, '0');
    if (MARKET_CONFIG.SCHEDULE.SPECIAL_CLOSED_DATES.includes(monthDay)) {
      return false;
    }

    // Si enableDailyHours está en false, ignorar dailyHours y dejar abierto
    if (MARKET_CONFIG.SCHEDULE.ENABLE_DAILY_HOURS === false) {
      return true;
    }

    // Comparación estricta de horas (Europe/Madrid) usando minutos totales
    const [openHour, openMin] = MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(":").map(Number);
    const [closeHour, closeMin] = MARKET_CONFIG.SCHEDULE.DAILY_HOURS.CLOSE.split(":").map(Number);
    const nowHour = timeInZone.getHours();
    const nowMin = timeInZone.getMinutes();

    const openTotal = openHour * 60 + openMin;
    const closeTotal = closeHour * 60 + closeMin;
    const nowTotal = nowHour * 60 + nowMin;

    let isOpen = false;
    if (closeTotal > openTotal) {
      // Horario normal (ej: 09:00-23:30)
      isOpen = nowTotal >= openTotal && nowTotal < closeTotal;
    } else if (closeTotal < openTotal) {
      // Horario que cruza medianoche (ej: 22:00-06:00)
      isOpen = nowTotal >= openTotal || nowTotal < closeTotal;
    } else {
      // Si apertura y cierre son iguales, mercado siempre cerrado
      isOpen = false;
    }
    return isOpen;
  }

  // Verificar si está en período de cierre extendido
  isExtendedClosurePeriod(currentTime) {
    const extClosure = MARKET_CONFIG.SCHEDULE.EXTENDED_CLOSURE;
    if (!extClosure.enabled) return false;

    const now = currentTime.getTime();
    const start = new Date(extClosure.startDate + ' ' + extClosure.startTime).getTime();
    const end = new Date(extClosure.endDate + ' ' + extClosure.endTime).getTime();

    return now >= start && now <= end;
  }

  // Obtener la próxima fecha/hora de apertura
  getNextOpenTime(currentTime = new Date()) {
    if (!MARKET_CONFIG.SCHEDULE.ENABLED) return null;

    const timeInZone = new Date(currentTime.toLocaleString("en-US", {timeZone: MARKET_CONFIG.SCHEDULE.TIMEZONE}));
    let nextOpen = new Date(timeInZone);

    // Si hay cierre extendido activo, calcular desde el final
    if (this.isExtendedClosurePeriod(timeInZone)) {
      const extClosure = MARKET_CONFIG.SCHEDULE.EXTENDED_CLOSURE;
      nextOpen = new Date(extClosure.endDate + ' ' + extClosure.endTime);
    } else {
      // Buscar el próximo día/hora de apertura
      let attempts = 0;
      while (attempts < 14) { // Máximo 2 semanas
        attempts++;
        
        // Si es un día cerrado, ir al siguiente
        const dayOfWeek = nextOpen.getDay();
        if (MARKET_CONFIG.SCHEDULE.CLOSED_DAYS.includes(dayOfWeek)) {
          nextOpen.setDate(nextOpen.getDate() + 1);
          nextOpen.setHours(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[0]);
          nextOpen.setMinutes(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[1]);
          continue;
        }

        // Verificar fecha especial
        const monthDay = String(nextOpen.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(nextOpen.getDate()).padStart(2, '0');
        if (MARKET_CONFIG.SCHEDULE.SPECIAL_CLOSED_DATES.includes(monthDay)) {
          nextOpen.setDate(nextOpen.getDate() + 1);
          nextOpen.setHours(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[0]);
          nextOpen.setMinutes(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[1]);
          continue;
        }

        // Si ya pasó la hora de cierre hoy, ir al día siguiente
        const currentTimeStr = nextOpen.getHours().toString().padStart(2, '0') + ':' + 
                              nextOpen.getMinutes().toString().padStart(2, '0');
        if (currentTimeStr > MARKET_CONFIG.SCHEDULE.DAILY_HOURS.CLOSE) {
          nextOpen.setDate(nextOpen.getDate() + 1);
          nextOpen.setHours(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[0]);
          nextOpen.setMinutes(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[1]);
          continue;
        }

        // Si aún no es hora de abrir hoy, usar la hora de apertura
        if (currentTimeStr < MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN) {
          nextOpen.setHours(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[0]);
          nextOpen.setMinutes(MARKET_CONFIG.SCHEDULE.DAILY_HOURS.OPEN.split(':')[1]);
        }

        break;
      }
    }

    return nextOpen;
  }

  // Obtener información del estado del mercado
  getMarketStatus() {
    const isOpen = this.isMarketOpen();
    const nextOpen = isOpen ? null : this.getNextOpenTime();
    
    let reason = '';
    if (!isOpen) {
      const now = new Date();
      const timeInZone = new Date(now.toLocaleString("en-US", {timeZone: MARKET_CONFIG.SCHEDULE.TIMEZONE}));
      
      if (this.isExtendedClosurePeriod(timeInZone)) {
        reason = MARKET_CONFIG.SCHEDULE.EXTENDED_CLOSURE.reason || 'Cierre extendido';
      } else if (MARKET_CONFIG.SCHEDULE.CLOSED_DAYS.includes(timeInZone.getDay())) {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        reason = `Mercado cerrado los ${dayNames[timeInZone.getDay()]}s`;
      } else {
        const monthDay = String(timeInZone.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(timeInZone.getDate()).padStart(2, '0');
        if (MARKET_CONFIG.SCHEDULE.SPECIAL_CLOSED_DATES.includes(monthDay)) {
          reason = 'Día festivo - Mercado cerrado';
        } else {
          reason = 'Fuera del horario de mercado';
        }
      }
    }

    return {
      isOpen,
      reason,
      nextOpen,
      allowViewing: MARKET_CONFIG.SCHEDULE.BEHAVIOR.ALLOW_VIEWING,
      showNextOpen: MARKET_CONFIG.SCHEDULE.BEHAVIOR.SHOW_NEXT_OPEN
    };
  }

  // Cargar datos de cryptos desde la base de datos o config
  async loadCryptoData() {
    try {
      // Forzar carga desde config por ahora - TODO: implement DB sync
      console.log('🔧 Forcing load from config.yml for new cryptos...');
      
      // Si no hay datos en BD, cargar desde config.yml
      console.log('📋 Loading cryptos from config.yml...');
      const cryptoConfig = config.crypto?.cryptocurrencies || {};
      
      for (const [symbol, cryptoInfo] of Object.entries(cryptoConfig)) {
        this.cryptoData.set(symbol, {
          id: symbol,
          symbol: symbol,
          name: cryptoInfo.name,
          base_price: cryptoInfo.basePrice,
          current_price: cryptoInfo.basePrice,
          tier: cryptoInfo.tier || 'COMMON',
          volatility: cryptoInfo.volatility || 'MEDIUM',
          personality: cryptoInfo.personality || 'balanced',
          emoji: cryptoInfo.emoji || '💰',
          is_active: true,
          lastPrice: cryptoInfo.basePrice,
          priceBuffer: [],
          momentum: 0,
          lastUpdate: new Date()
        });
      }
      
      console.log(`📊 Loaded ${this.cryptoData.size} cryptos into market engine`);
      
      if (this.cryptoData.size === 0) {
        console.log('⚠️  No cryptos found in config or database.');
      }
      
    } catch (error) {
      console.error('Error loading crypto data:', error);
      console.log('💡 Hint: Make sure config.yml has crypto configuration or run /admin-crypto-setup');
    }
  }

  // Inicializar historial de precios (últimas 24 horas simuladas)
  async initializePriceHistory() {
    for (const [cryptoId, crypto] of this.cryptoData) {
      const history = [];
      let currentPrice = crypto.base_price;
      
      // Generar 48 puntos de precio (últimas 24h, cada 30min)
      for (let i = 47; i >= 0; i--) {
        const timeAgo = new Date(Date.now() - (i * 30 * 60 * 1000));
        const change = this.generatePriceChange(crypto, 0.5); // Cambios menores para historia
        currentPrice *= (1 + change);
        
        history.push({
          price: currentPrice,
          timestamp: timeAgo,
          volume: Math.floor(Math.random() * 1000000) + 100000
        });
      }
      
      marketState.priceHistory.set(cryptoId, history);
    }
  }

  // Generar cambio de precio basado en personalidad y eventos
  generatePriceChange(crypto, intensityMultiplier = 1.0) {
    const personality = MARKET_CONFIG.PERSONALITIES[crypto.id] || {
      baseVolatility: 1.0,
      trendFollowing: 0.5,
      eventSensitivity: 1.0,
      recoverySpeed: 1.0
    };
    const volatilityLevel = personality.baseVolatility;
    
    // Componente random base
    const randomComponent = (Math.random() - 0.5) * 2; // -1 to 1
    
    // Componente de momentum (tendencia)
    const momentumComponent = crypto.momentum * personality.trendFollowing;
    
    // Componente de sentiment del mercado
    const sentimentComponent = (marketState.sentiment - 50) / 100 * 0.3;
    
    // Componente de eventos activos
    let eventComponent = 0;
    for (const [eventId, event] of marketState.activeEvents) {
      if (!event.affected_cryptos || event.affected_cryptos.includes(crypto.id)) {
        eventComponent += event.currentImpact * personality.eventSensitivity;
      }
    }
    
    // Combinar todos los componentes
    let totalChange = (
      randomComponent * personality.baseVolatility * volatilityLevel * intensityMultiplier +
      momentumComponent * 0.3 +
      sentimentComponent +
      eventComponent
    );
    
    // Limitar cambios extremos (excepto para eventos especiales)
    const maxChange = volatilityLevel * 2;
    totalChange = Math.max(-maxChange, Math.min(maxChange, totalChange));
    
    return totalChange;
  }

  // Actualizar precio de una crypto específica
  async updateCryptoPrice(cryptoId) {
    const crypto = this.cryptoData.get(cryptoId);
    if (!crypto) return;

    const priceChange = this.generatePriceChange(crypto);
    let newPrice = crypto.current_price * (1 + priceChange);
    
    // 🚫 PROTECCIÓN CONTRA PRECIOS NEGATIVOS Y EXTREMOS
    const minPrice = crypto.base_price * (MARKET_CONFIG.MARKET_DYNAMICS.MIN_PRICE_PERCENT || 10) / 100;
    const maxPrice = crypto.base_price * (MARKET_CONFIG.MARKET_DYNAMICS.MAX_PRICE_PERCENT || 500) / 100;
    
    // Asegurar que el precio nunca sea menor al mínimo o mayor al máximo
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
    
    // Actualizar momentum basado en dirección del cambio
    const actualChange = (newPrice - crypto.current_price) / crypto.current_price;
    crypto.momentum = (crypto.momentum * 0.7) + (actualChange * 0.3);
    crypto.momentum = Math.max(-1, Math.min(1, crypto.momentum));
    
    // Calcular cambio porcentual
    const changePercent = ((newPrice - crypto.lastPrice) / crypto.lastPrice) * 100;
    
    // Actualizar buffer de precios
    crypto.priceBuffer.push(newPrice);
    if (crypto.priceBuffer.length > 10) {
      crypto.priceBuffer.shift();
    }
    
    // Actualizar datos en memoria
    crypto.lastPrice = crypto.current_price;
    crypto.current_price = newPrice;
    crypto.change_1h = changePercent;
    crypto.lastUpdate = new Date();
    
    // Actualizar en base de datos
    await this.updateDatabasePrice(cryptoId, newPrice, changePercent);
    
    // Agregar al historial
    const history = marketState.priceHistory.get(cryptoId);
    const volume = this.calculateVolume(crypto, Math.abs(priceChange));
    history.push({
      price: newPrice,
      timestamp: new Date(),
      volume: volume
    });

    // Actualizar análisis técnico
    if (this.technicalAnalysis) {
      this.technicalAnalysis.addPricePoint(cryptoId, newPrice, volume);
    }
    
    // Mantener solo últimas 48 entradas (24 horas)
    if (history.length > 48) {
      history.shift();
    }
    
    return {
      cryptoId,
      oldPrice: crypto.lastPrice,
      newPrice,
      change: priceChange,
      changePercent
    };
  }

  // Actualizar precio en base de datos
  async updateDatabasePrice(cryptoId, price, change1h) {
    try {
      // Calcular cambio de 24h basado en historial
      const history = marketState.priceHistory.get(cryptoId);
      const price24hAgo = history && history.length >= 48 ? history[0].price : price;
      const change24h = ((price - price24hAgo) / price24hAgo) * 100;
      
      await this.db.execute(
        `UPDATE casino_cryptos 
         SET current_price = ?, change_1h = ?, change_24h = ?, updated_at = NOW() 
         WHERE id = ?`,
        [price, change1h, change24h, cryptoId]
      );
    } catch (error) {
      console.error(`Error updating price for ${cryptoId}:`, error);
    }
  }

  // Calcular volumen basado en volatilidad y actividad
  calculateVolume(crypto, volatility) {
    const baseVolume = crypto.circulating_supply * 0.001; // 0.1% del supply como base
    const volatilityMultiplier = 1 + (volatility * 10); // Más volatilidad = más volumen
    const sentimentMultiplier = 0.5 + (marketState.sentiment / 100); // Sentiment afecta volumen
    
    return Math.floor(baseVolume * volatilityMultiplier * sentimentMultiplier);
  }

  // Actualizar sentiment general del mercado
  updateMarketSentiment() {
    let totalChange = 0;
    let cryptoCount = 0;
    
    for (const [_, crypto] of this.cryptoData) {
      if (crypto.change_1h !== undefined) {
        totalChange += crypto.change_1h;
        cryptoCount++;
      }
    }
    
    const avgChange = cryptoCount > 0 ? totalChange / cryptoCount : 0;
    
    // Ajustar sentiment basado en cambio promedio
    const sentimentChange = avgChange * 2; // Amplificar el efecto
    marketState.sentiment += sentimentChange;
    
    // Mantener entre 0-100 con tendencia de retorno a 50
    marketState.sentiment = Math.max(10, Math.min(90, marketState.sentiment));
    marketState.sentiment += (50 - marketState.sentiment) * 0.02; // 2% retorno al centro
  }

  // Iniciar loops de actualización automática
  startMarketUpdates() {
    // Actualizar precios cada 30 segundos
    this.updateInterval = setInterval(async () => {
      if (!marketState.isActive) return;
      
      // 🕐 Verificar si el mercado está abierto
      const marketStatus = this.getMarketStatus();
      if (!marketStatus.isOpen && !MARKET_CONFIG.SCHEDULE.BEHAVIOR.ALLOW_PRICE_UPDATES) {
        // Mercado cerrado y no se permiten actualizaciones de precios
        return;
      }
      
      try {
        const updates = [];
        
        // Actualizar cada crypto (solo si el mercado está abierto o se permiten actualizaciones)
        for (const cryptoId of this.cryptoData.keys()) {
          const update = await this.updateCryptoPrice(cryptoId);
          if (update) updates.push(update);
        }
        
        // Actualizar sentiment del mercado
        this.updateMarketSentiment();
        
        marketState.lastUpdate = new Date();
        
        // Log cada 10 actualizaciones (5 minutos)
        if (Math.random() < 0.1) {
          // console.log(`📊 Market update: ${updates.length} cryptos updated, sentiment: ${marketState.sentiment.toFixed(1)}`);
        }
        
      } catch (error) {
        console.error('Error in market update:', error);
      }
    }, MARKET_CONFIG.PRICE_UPDATE_INTERVAL);
    
    // Verificar y ejecutar eventos cada minuto
    this.eventInterval = setInterval(async () => {
      // 🕐 Solo ejecutar eventos si el mercado está abierto (o se permite)
      const marketStatus = this.getMarketStatus();
      if (marketStatus.isOpen || !MARKET_CONFIG.SCHEDULE.BEHAVIOR.PAUSE_EVENTS) {
        await this.checkAndExecuteEvents();
      }
    }, MARKET_CONFIG.EVENT_CHECK_INTERVAL);
  }

  // Verificar y ejecutar eventos del mercado
  async checkAndExecuteEvents() {
    try {
      // Obtener eventos configurados del config.yml
      const events = config.crypto?.events || {};
      const eventTypes = Object.keys(events);
      
      for (const eventType of eventTypes) {
        const eventConfig = events[eventType];
        if (!eventConfig || !eventConfig.probability) continue;
        
        // Verificar si el evento debe activarse
        if (Math.random() < eventConfig.probability / 100) {
          await this.triggerMarketEvent(eventType, eventConfig);
        }
      }
    } catch (error) {
      console.error('Error checking market events:', error);
    }
  }

  async triggerMarketEvent(eventType, eventConfig) {
    // Evitar eventos duplicados recientes
    const eventId = `${eventType}_${Date.now()}`;
    if (marketState.activeEvents.has(eventType)) return;
    
    console.log(`⚡ Market Event Triggered: ${eventConfig.name || eventType}`);
    
    // Crear objeto del evento
    const event = {
      id: eventId,
      type: eventType,
      title: eventConfig.name || eventType,
      description: eventConfig.description || 'Market event in progress',
      price_impact_min: eventConfig.priceImpact?.min || -10,
      price_impact_max: eventConfig.priceImpact?.max || 10,
      duration_minutes: eventConfig.duration || 30,
      affected_cryptos: eventConfig.affectedCryptos || null,
      startTime: Date.now()
    };
    
    // Añadir a eventos activos
    marketState.activeEvents.set(eventType, event);
    
    // Aplicar efectos del evento
    await this.applyEventEffects(event);
    
    // Notificar al sistema de noticias
    await this.notifyNewsEngine(event);
    
    // Programar fin del evento
    setTimeout(() => {
      marketState.activeEvents.delete(eventType);
      console.log(`⏰ Market Event Ended: ${event.title}`);
    }, event.duration_minutes * 60 * 1000);
  }

  async applyEventEffects(event) {
    const affectedCryptos = event.affected_cryptos || Array.from(this.cryptoData.keys());
    
    for (const cryptoId of affectedCryptos) {
      if (this.cryptoData.has(cryptoId)) {
        const crypto = this.cryptoData.get(cryptoId);
        
        // Calcular impacto del evento
        const impactRange = event.price_impact_max - event.price_impact_min;
        const impact = event.price_impact_min + (Math.random() * impactRange);
        
        // Aplicar cambio de precio
        const priceChange = impact / 100;
        const newPrice = crypto.current_price * (1 + priceChange);
        
        // Actualizar precio y estadísticas
        crypto.change_1h = (crypto.change_1h || 0) + impact;
        crypto.change_24h = (crypto.change_24h || 0) + impact;
        crypto.current_price = Math.max(newPrice, crypto.base_price * 0.1);
        
        this.cryptoData.set(cryptoId, crypto);
        
        console.log(`📈 ${cryptoId}: ${impact > 0 ? '+' : ''}${impact.toFixed(2)}% (Event: ${event.title})`);
      }
    }
  }

  async notifyNewsEngine(event) {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const newsEngineModule = await import('./newsEngine.js');
      const newsEngine = newsEngineModule.default;
      
      if (newsEngine && newsEngine.client) {
        // El newsEngine se encargará de generar la noticia basada en el evento
        await newsEngine.createEventNews([event]);
      }
    } catch (error) {
      console.error('Error notifying news engine:', error);
    }
  }

  // Obtener datos actuales del mercado
  getMarketData() {
    const cryptos = Array.from(this.cryptoData.values()).map(crypto => ({
      id: crypto.id,
      name: crypto.name,
      symbol: crypto.symbol,
      emoji: crypto.emoji,
      price: parseFloat(crypto.current_price) || 0,
      basePrice: parseFloat(crypto.base_price) || 0,
      change1h: parseFloat(crypto.change_1h) || 0,
      change24h: parseFloat(crypto.change_24h) || 0,
      volatility: crypto.volatility_level,
      tier: crypto.tier,
      momentum: parseFloat(crypto.momentum) || 0,
      circulating_supply: parseInt(crypto.circulating_supply) || 1000000
    }));
    
    return {
      cryptos,
      marketSentiment: marketState.sentiment,
      volatilityIndex: marketState.volatilityIndex,
      activeEvents: Array.from(marketState.activeEvents.values()),
      lastUpdate: marketState.lastUpdate
    };
  }

  // Obtener datos de una crypto específica
  getCryptoData(cryptoId) {
    const crypto = this.cryptoData.get(cryptoId);
    if (!crypto) return null;
    
    const history = marketState.priceHistory.get(cryptoId) || [];
    
    return {
      ...crypto,
      priceHistory: history.slice(-24), // Últimas 12 horas
      momentum: crypto.momentum,
      personality: MARKET_CONFIG.PERSONALITIES[crypto.personality_type]
    };
  }

  // Generar hash único para transacciones
  generateTransactionHash() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Parar el motor (para shutdown limpio)
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.eventInterval) {
      clearInterval(this.eventInterval);
      this.eventInterval = null;
    }
    
    marketState.isActive = false;
    console.log('🛑 Market Engine stopped');
  }

  // Obtener análisis técnico
  getTechnicalAnalysis() {
    return this.technicalAnalysis;
  }
}

// Instancia singleton del motor
const marketEngine = new MarketEngine();

export default marketEngine;
export { MARKET_CONFIG, marketState };