-- ═══════════════════════════════════════════════════════════════
-- 🏆 USER ACHIEVEMENTS TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════

-- Tabla para el historial de logros de usuarios
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT NOT NULL,
    reward_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos adicionales del momento del logro
    portfolio_value DECIMAL(15, 2) DEFAULT NULL,
    total_trades INT DEFAULT NULL,
    crypto_owned JSON DEFAULT NULL, -- ['BTC', 'ETH'] - cryptos que tenía al momento
    market_event VARCHAR(100) DEFAULT NULL, -- Si fue durante un evento especial
    
    -- Índices para optimizar consultas
    INDEX idx_user_achievements (user_id, unlocked_at),
    INDEX idx_achievement_type (achievement_type, unlocked_at),
    INDEX idx_recent_achievements (unlocked_at DESC),
    
    -- Evitar duplicados del mismo achievement por usuario
    UNIQUE KEY unique_user_achievement (user_id, achievement_type)
);

-- Insertar algunos achievements de ejemplo (opcional)
INSERT IGNORE INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, reward_amount, unlocked_at) VALUES
('example_user', 'first_buy', 'First Steps', 'Made your first crypto purchase', 500.00, '2025-10-13 10:00:00'),
('example_user', 'day_trader', 'Day Trader 📈', 'Complete 10+ trades in one day', 1500.00, '2025-10-13 15:30:00');

-- Crear vista para estadísticas rápidas de achievements
CREATE OR REPLACE VIEW user_achievement_stats AS
SELECT 
    user_id,
    COUNT(*) as total_achievements,
    SUM(reward_amount) as total_rewards_earned,
    MIN(unlocked_at) as first_achievement,
    MAX(unlocked_at) as latest_achievement,
    GROUP_CONCAT(DISTINCT achievement_type ORDER BY unlocked_at) as achievement_timeline
FROM user_achievements 
GROUP BY user_id;

-- Crear vista para el ranking de achievements
CREATE OR REPLACE VIEW achievement_leaderboard AS
SELECT 
    user_id,
    COUNT(*) as total_achievements,
    SUM(reward_amount) as total_rewards,
    MAX(unlocked_at) as latest_achievement
FROM user_achievements 
GROUP BY user_id 
ORDER BY total_achievements DESC, total_rewards DESC;