-- ═══════════════════════════════════════════════════════════════
-- 🤖 BOT STATUS SYSTEM MIGRATION
-- ═══════════════════════════════════════════════════════════════
-- Tabla para almacenar los status del bot que se mostrarán como actividad
-- Reemplaza la configuración activity_statuses del config.yml

CREATE TABLE IF NOT EXISTS bot_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    type ENUM('PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'CUSTOM') DEFAULT 'CUSTOM',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_created (created_at)
);

-- Insertar los status por defecto del config.yml
INSERT INTO bot_status (text, type, is_active) VALUES
('Type /help for commands', 'CUSTOM', TRUE),
('Join the daily lottery!', 'CUSTOM', TRUE),
('Casino open 24/7!', 'CUSTOM', TRUE),
('Invest in Crypto /crypto!', 'CUSTOM', TRUE),
('Made by KayX with ❤️', 'CUSTOM', TRUE);

-- Tabla para configuración del sistema de status
CREATE TABLE IF NOT EXISTS bot_status_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO bot_status_config (setting_name, setting_value) VALUES
('presenceUpdateInterval', '10000'),
('enabled', 'true')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);