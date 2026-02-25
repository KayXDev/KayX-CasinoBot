-- Schema para el sistema de inventario
CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT FALSE, -- Para items que tienen duración
    expires_at TIMESTAMP NULL, -- Para items temporales
    INDEX idx_user_id (user_id),
    INDEX idx_item_id (item_id),
    UNIQUE KEY unique_user_item (user_id, item_id)
);

-- Tabla para efectos activos
CREATE TABLE IF NOT EXISTS active_effects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    effect_type VARCHAR(50) NOT NULL, -- 'multiplier', 'boost', 'protection', etc.
    effect_value DECIMAL(10, 2) NOT NULL, -- Valor del efecto (ej: 1.5 para 50% más)
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    source_item VARCHAR(50) NOT NULL, -- ID del item que causó el efecto
    INDEX idx_user_id (user_id),
    INDEX idx_effect_type (effect_type),
    INDEX idx_end_time (end_time)
);