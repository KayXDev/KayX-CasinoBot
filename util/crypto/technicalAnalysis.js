// ═══════════════════════════════════════════════════════════════
// 📊 CRYPTO TECHNICAL ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

export default class TechnicalAnalysis {
  constructor() {
    this.priceHistory = new Map(); // cryptoId -> [{price, timestamp, volume}, ...]
    this.maxHistoryPoints = 100; // Mantener últimos 100 puntos por crypto
  }

  // ═══════════════════════════════════════════════════════════════
  // 📈 PRICE HISTORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  addPricePoint(cryptoId, price, volume = 1000000) {
    if (!this.priceHistory.has(cryptoId)) {
      this.priceHistory.set(cryptoId, []);
    }

    const history = this.priceHistory.get(cryptoId);
    history.push({
      price: parseFloat(price),
      timestamp: Date.now(),
      volume: volume
    });

    // Mantener solo los últimos N puntos
    if (history.length > this.maxHistoryPoints) {
      history.shift();
    }
  }

  getPriceHistory(cryptoId, points = 20) {
    const history = this.priceHistory.get(cryptoId) || [];
    return history.slice(-points);
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 TECHNICAL INDICATORS
  // ═══════════════════════════════════════════════════════════════

  // Simple Moving Average
  calculateSMA(cryptoId, periods = 10) {
    const history = this.getPriceHistory(cryptoId, periods);
    if (history.length < periods) return null;

    const sum = history.reduce((acc, point) => acc + point.price, 0);
    return sum / periods;
  }

  // Exponential Moving Average
  calculateEMA(cryptoId, periods = 12) {
    const history = this.getPriceHistory(cryptoId, periods * 2);
    if (history.length < 2) return null;

    const multiplier = 2 / (periods + 1);
    let ema = history[0].price;

    for (let i = 1; i < history.length; i++) {
      ema = (history[i].price * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Relative Strength Index (RSI)
  calculateRSI(cryptoId, periods = 14) {
    const history = this.getPriceHistory(cryptoId, periods + 1);
    if (history.length < periods + 1) return 50; // Neutral RSI

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < history.length; i++) {
      const change = history[i].price - history[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / periods;
    const avgLoss = losses / periods;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(cryptoId) {
    const ema12 = this.calculateEMA(cryptoId, 12);
    const ema26 = this.calculateEMA(cryptoId, 26);
    
    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    
    // Simplified signal line (EMA of MACD)
    const signalLine = macdLine * 0.15; // Simplified calculation
    const histogram = macdLine - signalLine;

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  // Bollinger Bands
  calculateBollingerBands(cryptoId, periods = 20, stdDev = 2) {
    const history = this.getPriceHistory(cryptoId, periods);
    if (history.length < periods) return null;

    const sma = this.calculateSMA(cryptoId, periods);
    const prices = history.map(h => h.price);
    
    // Calculate standard deviation
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / periods;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎯 MARKET SIGNALS & ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  getMarketSignal(cryptoId) {
    const rsi = this.calculateRSI(cryptoId);
    const macd = this.calculateMACD(cryptoId);
    const currentPrice = this.getCurrentPrice(cryptoId);
    const sma20 = this.calculateSMA(cryptoId, 20);
    const sma50 = this.calculateSMA(cryptoId, 50);

    let signals = [];
    let strength = 0;
    let trend = 'NEUTRAL';

    // RSI Analysis
    if (rsi < 30) {
      signals.push('RSI Oversold - Potential Buy');
      strength += 2;
    } else if (rsi > 70) {
      signals.push('RSI Overbought - Potential Sell');
      strength -= 2;
    }

    // MACD Analysis
    if (macd && macd.macd > macd.signal) {
      signals.push('MACD Bullish');
      strength += 1;
    } else if (macd && macd.macd < macd.signal) {
      signals.push('MACD Bearish');
      strength -= 1;
    }

    // Moving Average Analysis
    if (sma20 && sma50 && currentPrice) {
      if (currentPrice > sma20 && sma20 > sma50) {
        signals.push('Price Above Moving Averages');
        trend = 'BULLISH';
        strength += 1;
      } else if (currentPrice < sma20 && sma20 < sma50) {
        signals.push('Price Below Moving Averages');
        trend = 'BEARISH';
        strength -= 1;
      }
    }

    // Determine overall signal
    let recommendation = 'HOLD';
    if (strength >= 3) {
      recommendation = 'STRONG BUY';
    } else if (strength >= 1) {
      recommendation = 'BUY';
    } else if (strength <= -3) {
      recommendation = 'STRONG SELL';
    } else if (strength <= -1) {
      recommendation = 'SELL';
    }

    return {
      recommendation,
      trend,
      strength,
      signals,
      rsi: Math.round(rsi),
      confidence: Math.min(95, Math.abs(strength) * 15 + 30)
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 📈 ADVANCED ASCII CHART GENERATION
  // ═══════════════════════════════════════════════════════════════

  generateASCIIChart(cryptoId, width = 50, height = 15, chartType = 'candlestick') {
    const history = this.getPriceHistory(cryptoId, width);
    if (history.length < 2) return 'Insufficient data for chart';

    if (chartType === 'candlestick') {
      return this.generateCandlestickChart(history, width, height);
    } else if (chartType === 'volume') {
      return this.generateVolumeChart(history, width, height);
    } else if (chartType === 'clean-line') {
      return this.generateCleanLineChart(history, width, height);
    } else {
      return this.generateAdvancedLineChart(history, width, height);
    }
  }

  generateAdvancedLineChart(history, width, height) {
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Calculate moving averages for overlay
    const sma5 = this.calculateMovingAverage(prices, 5);
    const sma10 = this.calculateMovingAverage(prices, 10);

    let chart = '';
    
    // Header with price info
    chart += `┌${'─'.repeat(width + 15)}┐\n`;
    chart += `│ HIGH: $${maxPrice.toFixed(2).padEnd(8)} LOW: $${minPrice.toFixed(2).padEnd(8)} │\n`;
    chart += `├${'─'.repeat(width + 15)}┤\n`;
    
    // Generate chart from top to bottom
    for (let y = height - 1; y >= 0; y--) {
      let line = '│';
      const threshold = minPrice + (priceRange * y / (height - 1));
      
      for (let x = 0; x < prices.length; x++) {
        const price = prices[x];
        const prevPrice = x > 0 ? prices[x - 1] : price;
        const sma5Val = sma5[x];
        const sma10Val = sma10[x];
        
        let char = ' ';
        
        // Priority system: Price line first, then SMA lines
        const priceDistance = Math.abs(price - threshold);
        const sma5Distance = sma5Val ? Math.abs(sma5Val - threshold) : Infinity;
        const sma10Distance = sma10Val ? Math.abs(sma10Val - threshold) : Infinity;
        
        const tolerance = priceRange / (height * 1.8);
        
        // Find the closest line to display
        if (priceDistance <= tolerance && priceDistance <= sma5Distance && priceDistance <= sma10Distance) {
          // Price line has priority
          if (price > prevPrice) {
            char = '▲'; // Triangle up for price increase
          } else if (price < prevPrice) {
            char = '▼'; // Triangle down for price decrease
          } else {
            char = '●'; // Dot for stable price
          }
        } else if (sma5Distance <= tolerance && sma5Distance < sma10Distance) {
          char = '─'; // Line for SMA5
        } else if (sma10Distance <= tolerance) {
          char = '┄'; // Dotted line for SMA10
        }
        
        line += char;
      }
      
      // Add price labels on the right
      const labelPrice = minPrice + (priceRange * y / (height - 1));
      line += `│ $${labelPrice.toFixed(2)}`;
      
      chart += line + '\n';
    }

    // Footer with legend
    chart += `└${'─'.repeat(width + 15)}┘\n`;
    chart += '▲ Price Up  ▼ Price Down  ● Stable  ─ SMA5  ┄ SMA10\n';
    chart += `Time: ${history.length} periods | Range: $${(maxPrice - minPrice).toFixed(2)}`;

    return chart;
  }

  generateCleanLineChart(history, width, height) {
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    let chart = '';
    
    // Header with price info
    chart += `┌${'─'.repeat(width + 15)}┐\n`;
    chart += `│ ${history[0].crypto} PRICE CHART ${' '.repeat(width - 8)} │\n`;
    chart += `│ HIGH: $${maxPrice.toFixed(2).padEnd(8)} LOW: $${minPrice.toFixed(2).padEnd(8)} │\n`;
    chart += `├${'─'.repeat(width + 15)}┤\n`;
    
    // Create a clean line path
    const linePoints = [];
    for (let x = 0; x < prices.length; x++) {
      const price = prices[x];
      const y = Math.round((height - 1) * (maxPrice - price) / priceRange);
      linePoints.push({ x, y: Math.max(0, Math.min(height - 1, y)) });
    }
    
    // Generate chart from top to bottom
    for (let y = 0; y < height; y++) {
      let line = '│';
      
      for (let x = 0; x < width; x++) {
        let char = ' ';
        
        // Check if this position has a price point
        const pointIndex = Math.floor(x * prices.length / width);
        if (pointIndex < linePoints.length) {
          const point = linePoints[pointIndex];
          
          if (point.y === y) {
            // Main price line
            const currentPrice = prices[pointIndex];
            const prevPrice = pointIndex > 0 ? prices[pointIndex - 1] : currentPrice;
            
            if (currentPrice > prevPrice) {
              char = '●'; // Current point up
            } else if (currentPrice < prevPrice) {
              char = '●'; // Current point down  
            } else {
              char = '●'; // Stable point
            }
          } else {
            // Draw connecting lines
            if (pointIndex > 0) {
              const prevPoint = linePoints[pointIndex - 1];
              const currPoint = linePoints[pointIndex];
              
              // Check if we're on the line between points
              if (this.isOnLine(x - Math.floor((pointIndex - 1) * width / prices.length), 
                                 0, prevPoint.y, 
                                 Math.floor(width / prices.length), currPoint.y, 
                                 y)) {
                char = currPoint.y > prevPoint.y ? '╱' : currPoint.y < prevPoint.y ? '╲' : '─';
              }
            }
          }
        }
        
        line += char;
      }
      
      // Add price labels on the right
      const labelPrice = maxPrice - (priceRange * y / (height - 1));
      line += `│ $${labelPrice.toFixed(2)}`;
      
      chart += line + '\n';
    }

    // Footer
    chart += `└${'─'.repeat(width + 15)}┘\n`;
    
    // Trend indicator
    const trend = prices[prices.length - 1] > prices[0] ? '📈 UPTREND' : '📉 DOWNTREND';
    const changePercent = ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2);
    
    chart += `● Price Points  ╱╲ Trend Lines  │ Change: ${changePercent}% ${trend}`;

    return chart;
  }

  // Helper function to check if a point is on a line
  isOnLine(x, x1, y1, x2, y2, targetY) {
    if (x < x1 || x > x2) return false;
    if (x1 === x2) return targetY === y1;
    
    const expectedY = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    return Math.abs(expectedY - targetY) < 0.6;
  }

  generateCandlestickChart(history, width, height) {
    if (history.length < 4) return 'Need more data for candlestick chart';

    // Group data into candlesticks (4 periods each)
    const candlesticks = [];
    for (let i = 0; i < history.length - 3; i += 4) {
      const slice = history.slice(i, i + 4);
      const prices = slice.map(h => h.price);
      candlesticks.push({
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1]
      });
    }

    const allPrices = candlesticks.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    let chart = '';
    
    // Header
    chart += `┌─ CANDLESTICK CHART ${'─'.repeat(width - 15)}┐\n`;
    
    // Generate chart
    for (let y = height - 1; y >= 0; y--) {
      let line = '│';
      const threshold = minPrice + (priceRange * y / (height - 1));
      
      for (let x = 0; x < candlesticks.length && x < width; x++) {
        const candle = candlesticks[x];
        const isGreen = candle.close > candle.open;
        
        let char = ' ';
        
        // High wick
        if (threshold <= candle.high && threshold >= Math.max(candle.open, candle.close)) {
          char = '│';
        }
        // Low wick  
        else if (threshold >= candle.low && threshold <= Math.min(candle.open, candle.close)) {
          char = '│';
        }
        // Body
        else if (threshold >= Math.min(candle.open, candle.close) && 
                 threshold <= Math.max(candle.open, candle.close)) {
          char = isGreen ? '█' : '▓';
        }
        
        line += char;
      }
      
      const labelPrice = minPrice + (priceRange * y / (height - 1));
      line += `│ $${labelPrice.toFixed(2)}`;
      chart += line + '\n';
    }
    
    chart += `└${'─'.repeat(width + 15)}┘\n`;
    chart += '█ Bullish Candle  ▓ Bearish Candle  │ Wicks\n';

    return chart;
  }

  generateVolumeChart(history, width, height) {
    const volumes = history.map(h => h.volume || 1000000);
    const maxVolume = Math.max(...volumes);
    
    let chart = '';
    chart += `┌─ VOLUME CHART ${'─'.repeat(width - 10)}┐\n`;
    
    // Volume bars
    for (let y = height - 1; y >= 0; y--) {
      let line = '│';
      const threshold = (maxVolume * y / (height - 1));
      
      for (let x = 0; x < volumes.length && x < width; x++) {
        const volume = volumes[x];
        
        if (volume >= threshold) {
          const intensity = volume / maxVolume;
          if (intensity > 0.8) line += '█';
          else if (intensity > 0.6) line += '▆';
          else if (intensity > 0.4) line += '▄';
          else if (intensity > 0.2) line += '▂';
          else line += '░';
        } else {
          line += ' ';
        }
      }
      
      line += `│ ${(threshold / 1000000).toFixed(1)}M`;
      chart += line + '\n';
    }
    
    chart += `└${'─'.repeat(width + 10)}┘\n`;
    chart += `Max Volume: ${(maxVolume / 1000000).toFixed(1)}M`;

    return chart;
  }

  // Utility function for moving averages
  calculateMovingAverage(prices, periods) {
    const sma = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < periods - 1) {
        sma.push(null);
      } else {
        const slice = prices.slice(i - periods + 1, i + 1);
        const avg = slice.reduce((a, b) => a + b) / periods;
        sma.push(avg);
      }
    }
    return sma;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🌐 WEB CHART GENERATION
  // ═══════════════════════════════════════════════════════════════

  generateWebChartURL(cryptoId, interval = '1D', style = 'candles') {
    const cryptoSymbols = {
      'BTC': 'BTCUSD',
      'ETH': 'ETHUSD', 
      'ADA': 'ADAUSD',
      'DOT': 'DOTUSD'
    };

    const symbol = cryptoSymbols[cryptoId] || 'BTCUSD';
    
    // Simplified TradingView URL
    return `https://www.tradingview.com/symbols/${symbol}/`;
  }

  generateQuickChartURL(cryptoId, type = 'line') {
    // Generate a simple chart URL without complex parameters
    const currentPrice = this.marketEngine?.getCryptoData(cryptoId)?.price || 50000;
    const shortUrl = `https://tinyurl.com/crypto-${cryptoId.toLowerCase()}-chart`;
    
    // Fallback to a simple static chart service
    return `https://chart-image.com/${cryptoId}`;
  }

  generateCoinGeckoChart(cryptoId, days = 7) {
    const coinIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'ADA': 'cardano', 
      'DOT': 'polkadot'
    };

    const coinId = coinIds[cryptoId] || 'bitcoin';
    return `https://coingecko.com/coins/${coinId}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔮 TREND PREDICTION
  // ═══════════════════════════════════════════════════════════════

  predictTrend(cryptoId) {
    const history = this.getPriceHistory(cryptoId, 20);
    if (history.length < 10) return null;

    // Simple linear regression for trend prediction
    const n = history.length;
    const sumX = n * (n + 1) / 2;
    const sumY = history.reduce((sum, h) => sum + h.price, 0);
    const sumXY = history.reduce((sum, h, index) => sum + (index + 1) * h.price, 0);
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next few periods
    const predictions = [];
    for (let i = 1; i <= 5; i++) {
      const nextPeriod = n + i;
      const predictedPrice = slope * nextPeriod + intercept;
      predictions.push(predictedPrice);
    }

    // Calculate trend strength
    const currentPrice = history[history.length - 1].price;
    const trendDirection = slope > 0 ? 'UP' : slope < 0 ? 'DOWN' : 'SIDEWAYS';
    const trendStrength = Math.abs(slope) / currentPrice * 100;

    return {
      direction: trendDirection,
      strength: Math.min(100, trendStrength * 10),
      confidence: Math.min(95, history.length * 4),
      predictions,
      nextPrice: predictions[0]
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  getCurrentPrice(cryptoId) {
    const history = this.getPriceHistory(cryptoId, 1);
    return history.length > 0 ? history[0].price : null;
  }

  getAnalyticsSummary(cryptoId) {
    const signal = this.getMarketSignal(cryptoId);
    const trend = this.predictTrend(cryptoId);
    const rsi = this.calculateRSI(cryptoId);
    const bollinger = this.calculateBollingerBands(cryptoId);
    const currentPrice = this.getCurrentPrice(cryptoId);

    return {
      currentPrice,
      signal,
      trend,
      indicators: {
        rsi: Math.round(rsi),
        sma20: this.calculateSMA(cryptoId, 20),
        sma50: this.calculateSMA(cryptoId, 50),
        bollinger
      }
    };
  }
}