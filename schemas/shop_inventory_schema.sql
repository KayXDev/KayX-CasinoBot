-- Schema para el sistema de tienda e inventario

-- Tabla para items del inventario de usuarios
CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    expires_at TIMESTAMP NULL DEFAULT NULL,  -- Para items temporales
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_item_id (item_id),
    UNIQUE KEY unique_user_item (user_id, item_id)
);

-- Tabla para efectos activos de usuarios
CREATE TABLE IF NOT EXISTS user_effects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    effect_type VARCHAR(50) NOT NULL,  -- 'bank_limit', 'coin_multiplier', 'exp_multiplier', etc.
    effect_value DECIMAL(10, 2) NOT NULL,  -- Valor del efecto
    expires_at TIMESTAMP NULL DEFAULT NULL,  -- NULL para efectos permanentes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_effect_type (effect_type)
);

-- Actualizar tabla users para agregar campos relacionados con items
ALTER TABLE users 
ADD COLUMN bank_limit INT DEFAULT 50000 AFTER bank,
ADD COLUMN experience INT DEFAULT 0 AFTER bank_limit,
ADD COLUMN level INT DEFAULT 1 AFTER experience;