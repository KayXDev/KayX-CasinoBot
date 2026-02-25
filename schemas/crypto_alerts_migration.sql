-- ═══════════════════════════════════════════════════════════════
-- 🔔 USER CRYPTO ALERTS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Tabla para alertas personalizadas de precio por usuario
CREATE TABLE IF NOT EXISTS user_crypto_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    alert_type ENUM('above', 'below', 'change_percent') NOT NULL,
    target_price DECIMAL(15, 8) DEFAULT NULL,
    change_percent DECIMAL(8, 4) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_count INT NOT NULL DEFAULT 0,
    last_triggered TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para optimizar consultas
    INDEX idx_user_alerts (user_id, is_active),
    INDEX idx_active_alerts (is_active, crypto_symbol),
    INDEX idx_alert_checks (crypto_symbol, alert_type, is_active)
);

-- Tabla para historial de alertas disparadas
CREATE TABLE IF NOT EXISTS crypto_alert_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    target_price DECIMAL(15, 8) DEFAULT NULL,
    actual_price DECIMAL(15, 8) NOT NULL,
    message TEXT DEFAULT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_user_history (user_id, triggered_at),
    INDEX idx_recent_alerts (triggered_at DESC)
);