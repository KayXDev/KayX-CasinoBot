-- Migración para añadir soporte a items de robo especializados
-- Fecha: 2025-10-08
-- Versión: 1.3

-- Crear tabla para items de robo equipados
CREATE TABLE IF NOT EXISTS user_heist_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_type ENUM('lockpick_kit', 'hacking_laptop', 'stealth_suit', 'decoder_device', 'master_thief_kit') NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    uses_remaining INT DEFAULT -1, -- -1 para items permanentes
    UNIQUE KEY unique_user_item (user_id, item_type),
    INDEX idx_user_active (user_id, is_active)
);

-- Crear tabla para consumibles de robo
CREATE TABLE IF NOT EXISTS user_heist_consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_type ENUM('adrenaline_shot', 'focus_pills', 'intel_report', 'getaway_car', 'fake_id') NOT NULL,
    quantity INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_consumable (user_id, item_type),
    INDEX idx_user_id (user_id)
);

-- Añadir columnas a la tabla de inventario existente para efectos activos
ALTER TABLE shop_inventory 
ADD COLUMN heist_bonus_active BOOLEAN DEFAULT FALSE,
ADD COLUMN heist_bonus_expiry TIMESTAMP NULL,
ADD COLUMN heist_bonus_type VARCHAR(50) NULL;

-- Crear tabla para historial de uso de items en robos
CREATE TABLE IF NOT EXISTS heist_item_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    bank_type ENUM('local', 'regional', 'national', 'reserve') NOT NULL,
    items_used JSON, -- Almacena array de items usados
    success BOOLEAN NOT NULL,
    bonus_applied DECIMAL(4,3) DEFAULT 0.000,
    usage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, usage_date),
    INDEX idx_success (success)
);

-- Insertar valores por defecto para usuarios existentes
INSERT IGNORE INTO user_heist_equipment (user_id, item_type, is_active, uses_remaining) 
SELECT DISTINCT user_id, 'lockpick_kit', FALSE, 0 FROM users;

INSERT IGNORE INTO user_heist_consumables (user_id, item_type, quantity) 
SELECT DISTINCT user_id, 'adrenaline_shot', 0 FROM users;

INSERT IGNORE INTO user_heist_consumables (user_id, item_type, quantity) 
SELECT DISTINCT user_id, 'focus_pills', 0 FROM users;

INSERT IGNORE INTO user_heist_consumables (user_id, item_type, quantity) 
SELECT DISTINCT user_id, 'intel_report', 0 FROM users;

INSERT IGNORE INTO user_heist_consumables (user_id, item_type, quantity) 
SELECT DISTINCT user_id, 'getaway_car', 0 FROM users;

INSERT IGNORE INTO user_heist_consumables (user_id, item_type, quantity) 
SELECT DISTINCT user_id, 'fake_id', 0 FROM users;

-- Crear vista para obtener bonificaciones activas de un usuario
CREATE OR REPLACE VIEW user_active_heist_bonuses AS
SELECT 
    ue.user_id,
    GROUP_CONCAT(ue.item_type) as equipment,
    SUM(
        CASE 
            WHEN ue.item_type = 'lockpick_kit' THEN 0.15
            WHEN ue.item_type = 'hacking_laptop' THEN 0.20
            WHEN ue.item_type = 'stealth_suit' THEN 0.25
            WHEN ue.item_type = 'decoder_device' THEN 0.30
            WHEN ue.item_type = 'master_thief_kit' THEN 0.10
            ELSE 0
        END
    ) as total_bonus
FROM user_heist_equipment ue
WHERE ue.is_active = TRUE
GROUP BY ue.user_id;