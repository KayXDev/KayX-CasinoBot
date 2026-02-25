-- ═══════════════════════════════════════════════════════════════
-- 🚀 CASINO METAVERSE EXCHANGE - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de cryptomonedas del casino
CREATE TABLE IF NOT EXISTS casino_cryptos (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    current_price DECIMAL(15, 8) NOT NULL DEFAULT 1.00000000,
    base_price DECIMAL(15, 8) NOT NULL DEFAULT 1.00000000,
    change_24h DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
    change_1h DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
    volume_24h BIGINT NOT NULL DEFAULT 0,
    market_cap BIGINT NOT NULL DEFAULT 0,
    volatility_level ENUM('LOW', 'MEDIUM', 'HIGH', 'EXTREME', 'INSANE') DEFAULT 'MEDIUM',
    personality_type ENUM('conservative', 'volatile', 'manic', 'stable', 'mysterious') DEFAULT 'volatile',
    tier ENUM('LEGENDARY', 'EPIC', 'RARE', 'COMMON') DEFAULT 'COMMON',
    max_supply BIGINT DEFAULT NULL,
    circulating_supply BIGINT NOT NULL DEFAULT 1000000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Portfolio de cryptos por usuario
CREATE TABLE IF NOT EXISTS crypto_portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    crypto_id VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0.00000000,
    avg_buy_price DECIMAL(15, 8) NOT NULL DEFAULT 0.00000000,
    total_invested DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_realized_gains DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    first_purchase TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (crypto_id) REFERENCES casino_cryptos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_crypto (user_id, crypto_id),
    INDEX idx_user_portfolio (user_id),
    INDEX idx_crypto_holders (crypto_id)
);

-- Historial de transacciones crypto
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    crypto_id VARCHAR(10) NOT NULL,
    transaction_type ENUM('BUY', 'SELL', 'TRANSFER') NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    price_per_coin DECIMAL(15, 8) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    fee_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    transaction_hash VARCHAR(64) NOT NULL UNIQUE,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crypto_id) REFERENCES casino_cryptos(id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id, created_at),
    INDEX idx_crypto_transactions (crypto_id, created_at),
    INDEX idx_transaction_type (transaction_type, created_at)
);

-- Órdenes activas (limit orders, stop loss, etc.) - ELIMINADO - TABLA REMOVIDA

-- Eventos del mercado
CREATE TABLE IF NOT EXISTS crypto_market_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    affected_cryptos JSON DEFAULT NULL, -- ['CSN', 'MOON'] or null for all
    price_impact_min DECIMAL(8, 4) NOT NULL, -- -50.0000 for -50%
    price_impact_max DECIMAL(8, 4) NOT NULL, -- 200.0000 for +200%
    duration_minutes INT NOT NULL DEFAULT 30,
    probability_weight INT NOT NULL DEFAULT 10, -- Higher = more likely
    cooldown_hours INT NOT NULL DEFAULT 4, -- Min time before same event
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_triggered TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de eventos ejecutados
CREATE TABLE IF NOT EXISTS crypto_event_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    affected_cryptos JSON NOT NULL,
    actual_impact JSON NOT NULL, -- {'CSN': 15.5, 'MOON': 234.7}
    duration_minutes INT NOT NULL,
    participants_count INT NOT NULL DEFAULT 0,
    total_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (event_id) REFERENCES crypto_market_events(id) ON DELETE CASCADE,
    INDEX idx_event_history (started_at, event_type)
);

-- Logros crypto de usuarios
CREATE TABLE IF NOT EXISTS crypto_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    progress_current INT NOT NULL DEFAULT 0,
    progress_required INT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    reward_amount DECIMAL(15, 2) DEFAULT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_achievement (user_id, achievement_type),
    INDEX idx_user_achievements (user_id, is_completed),
    INDEX idx_achievement_leaderboard (achievement_type, completed_at)
);

-- ═══════════════════════════════════════════════════════════════
-- 🏛️ DATOS INICIALES - LAS 4 CRYPTOS PRINCIPALES
-- ═══════════════════════════════════════════════════════════════

INSERT IGNORE INTO casino_cryptos (id, name, symbol, emoji, current_price, base_price, volatility_level, personality_type, tier, max_supply, circulating_supply) VALUES
-- LEGENDARY TIER (Top Market Cap)
('BTC', 'Bitcoin', 'BTC', '�', 67000.00000000, 67000.00000000, 'MEDIUM', 'stable', 'LEGENDARY', 21000000, 19750000),
('ETH', 'Ethereum', 'ETH', '�', 2600.00000000, 2600.00000000, 'MEDIUM', 'volatile', 'LEGENDARY', NULL, 120400000),

-- EPIC TIER (Strong Projects)
('BNB', 'Binance Coin', 'BNB', '�', 600.00000000, 600.00000000, 'LOW', 'conservative', 'EPIC', 200000000, 153800000),
('SOL', 'Solana', 'SOL', '�', 150.00000000, 150.00000000, 'HIGH', 'volatile', 'EPIC', NULL, 470000000);

-- ═══════════════════════════════════════════════════════════════
-- 🎪 EVENTOS INICIALES DEL MERCADO
-- ═══════════════════════════════════════════════════════════════

INSERT IGNORE INTO crypto_market_events (event_type, title, description, affected_cryptos, price_impact_min, price_impact_max, duration_minutes, probability_weight, cooldown_hours) VALUES
('btc_whale', 'Bitcoin Whale Movement', 'Massive BTC transfers detected! Whale activity causes volatility!', '["BTC"]', -15.0000, 25.0000, 45, 15, 8),
('eth_upgrade', 'Ethereum Network Activity', 'High network usage and DeFi activity pumps ETH price!', '["ETH"]', 5.0000, 30.0000, 60, 18, 6),
('market_pump', 'Crypto Market Pump', 'Positive market sentiment drives all cryptos higher!', NULL, 8.0000, 35.0000, 40, 20, 5),
('flash_crash', 'Flash Crash', 'Sudden market panic causes temporary price drops across the board!', NULL, -40.0000, -15.0000, 20, 8, 12),
('binance_news', 'Binance Exchange Rally', 'Major Binance announcements boost BNB and market confidence!', '["BNB"]', 10.0000, 50.0000, 35, 12, 10),
('solana_surge', 'Solana Ecosystem Boom', 'New Solana projects and NFT activity drive SOL price up!', '["SOL"]', -10.0000, 80.0000, 30, 16, 7);

-- ═══════════════════════════════════════════════════════════════
-- 🏆 ACHIEVEMENTS TEMPLATE
-- ═══════════════════════════════════════════════════════════════

-- Estos achievements se crearán dinámicamente cuando los usuarios empiecen a usar el sistema
-- Ejemplos de achievements que se implementarán:
-- 'first_buy' - Primera compra de crypto
-- 'diamond_hands' - Mantener posición por 30+ días  
-- 'moon_mission' - Ganar +500% en MOON coin
-- 'whale_status' - Portfolio value >$100,000
-- 'perfect_timing' - Comprar en el bottom exacto
-- 'portfolio_master' - Tener las 4 cryptos principales
-- 'day_trader' - Realizar 10+ trades en un día
-- 'hodler' - No vender nada por 7+ días consecutivos

-- ═══════════════════════════════════════════════════════════════
-- 📊 ÍNDICES ADICIONALES YA INCLUIDOS EN LAS TABLAS PRINCIPALES
-- ═══════════════════════════════════════════════════════════════

-- Los índices ya están incluidos en los CREATE TABLE statements arriba

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRACIÓN COMPLETADA
-- ═══════════════════════════════════════════════════════════════

-- Esta migración crea un sistema completo de exchange crypto gamificado
-- Listo para integrar con el bot de casino existente
-- Soporta: Portfolio tracking, Trading, Orders, Events, Achievements