-- Migration: Create user_effects table
-- This table stores temporary effects applied to users (like boosts, multipliers, etc.)

CREATE TABLE IF NOT EXISTS user_effects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    effect_type VARCHAR(50) NOT NULL,
    effect_value DECIMAL(10,4) DEFAULT 1.0000,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_effect_type (effect_type),
    INDEX idx_expires_at (expires_at)
);

-- Add some example effect types for reference
-- INSERT INTO user_effects (user_id, effect_type, effect_value, expires_at) VALUES 
-- ('388422519553654786', 'luck_boost', 1.5000, DATE_ADD(NOW(), INTERVAL 1 HOUR)),
-- ('388422519553654786', 'coin_multiplier', 2.0000, DATE_ADD(NOW(), INTERVAL 30 MINUTE));