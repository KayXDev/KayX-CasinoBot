-- ═══════════════════════════════════════════════════════════════
-- 📈 ADVANCED TRADING SYSTEM - Trading Avanzado
-- ═══════════════════════════════════════════════════════════════

-- Tabla de mercados adicionales (acciones, materias primas)
CREATE TABLE IF NOT EXISTS trading_markets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    market_type ENUM('stock', 'commodity', 'forex') NOT NULL,
    sector VARCHAR(50),
    current_price DECIMAL(15,4) NOT NULL,
    base_price DECIMAL(15,4) NOT NULL,
    volatility DECIMAL(5,4) DEFAULT 0.08,
    volume_24h DECIMAL(20,2) DEFAULT 0.00,
    market_cap DECIMAL(20,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_market_symbol (symbol),
    INDEX idx_market_type (market_type),
    INDEX idx_price_update (last_updated)
);

-- Tabla de trading bots
CREATE TABLE IF NOT EXISTS user_trading_bots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    bot_name VARCHAR(50) NOT NULL,
    bot_type ENUM('grid_bot', 'dca_bot', 'arbitrage_bot', 'ai_bot') NOT NULL,
    target_symbol VARCHAR(10) NOT NULL,
    investment_amount DECIMAL(15,2) NOT NULL,
    configuration JSON NOT NULL, -- Configuración específica del bot
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_execution TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_trades INT DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0.00,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_user_bots (user_id),
    INDEX idx_bot_execution (last_execution),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de órdenes avanzadas
CREATE TABLE IF NOT EXISTS trading_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    order_type ENUM('limit', 'stop_loss', 'take_profit', 'trailing_stop') NOT NULL,
    side ENUM('buy', 'sell') NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    trigger_price DECIMAL(15,4) NOT NULL,
    execution_price DECIMAL(15,4),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_date TIMESTAMP NULL,
    expires_date TIMESTAMP NULL,
    order_status ENUM('pending', 'executed', 'cancelled', 'expired') DEFAULT 'pending',
    trailing_distance DECIMAL(5,2), -- Para trailing stops
    bot_id INT NULL, -- Si fue creada por un bot
    INDEX idx_user_orders (user_id),
    INDEX idx_symbol_orders (symbol),
    INDEX idx_pending_orders (order_status, trigger_price),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES user_trading_bots(id) ON DELETE SET NULL
);

-- Tabla de competencias de trading
CREATE TABLE IF NOT EXISTS trading_competitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_name VARCHAR(100) NOT NULL,
    description TEXT,
    entry_fee DECIMAL(10,2) NOT NULL,
    prize_pool DECIMAL(15,2) NOT NULL,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    max_participants INT DEFAULT 100,
    current_participants INT DEFAULT 0,
    competition_status ENUM('upcoming', 'active', 'ended', 'cancelled') DEFAULT 'upcoming',
    rules JSON, -- Reglas específicas de la competencia
    created_by VARCHAR(20) NOT NULL,
    INDEX idx_competition_dates (start_date, end_date),
    INDEX idx_competition_status (competition_status)
);

-- Tabla de participantes en competencias
CREATE TABLE IF NOT EXISTS competition_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    starting_balance DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    total_trades INT DEFAULT 0,
    best_trade DECIMAL(15,2) DEFAULT 0.00,
    worst_trade DECIMAL(15,2) DEFAULT 0.00,
    final_rank INT,
    prize_won DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE KEY unique_participant (competition_id, user_id),
    INDEX idx_competition_leaderboard (competition_id, current_balance DESC),
    FOREIGN KEY (competition_id) REFERENCES trading_competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de análisis técnico (indicadores calculados)
CREATE TABLE IF NOT EXISTS technical_indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    indicator_type ENUM('SMA', 'EMA', 'RSI', 'MACD', 'BB', 'STOCH') NOT NULL,
    timeframe ENUM('1m', '5m', '15m', '1h', '4h', '1d') NOT NULL,
    value DECIMAL(15,6) NOT NULL,
    trade_signal ENUM('buy', 'sell', 'neutral') DEFAULT 'neutral',
    strength DECIMAL(3,2) DEFAULT 1.00, -- 0.00 a 1.00
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_indicator (symbol, indicator_type),
    INDEX idx_calculation_time (calculated_at)
);

-- Insertar datos iniciales para mercados de acciones
INSERT IGNORE INTO trading_markets (symbol, name, market_type, sector, current_price, base_price, volatility) VALUES
('CASI', 'MegaCasino Corp', 'stock', 'Gaming', 150.00, 150.00, 0.08),
('LUCK', 'Lucky Holdings', 'stock', 'Entertainment', 85.00, 85.00, 0.10),
('DICE', 'Dice Industries', 'stock', 'Technology', 220.00, 220.00, 0.12),
('CHIP', 'Chip & Games Ltd', 'stock', 'Manufacturing', 95.00, 95.00, 0.09),
('SLOT', 'SlotMachine Inc', 'stock', 'Gaming', 45.00, 45.00, 0.15),
('CARD', 'CardGame Systems', 'stock', 'Technology', 180.00, 180.00, 0.11);

-- Insertar datos iniciales para materias primas
INSERT IGNORE INTO trading_markets (symbol, name, market_type, current_price, base_price, volatility) VALUES
('GOLD', 'Oro Virtual', 'commodity', 2000.00, 2000.00, 0.05),
('SILVER', 'Plata Virtual', 'commodity', 25.00, 25.00, 0.08),
('OIL', 'Petróleo Virtual', 'commodity', 75.00, 75.00, 0.15),
('COPPER', 'Cobre Virtual', 'commodity', 4.00, 4.00, 0.12),
('WHEAT', 'Trigo Virtual', 'commodity', 8.00, 8.00, 0.10),
('COFFEE', 'Café Virtual', 'commodity', 250.00, 250.00, 0.20);

SELECT 'Advanced trading system tables created successfully!' as message;