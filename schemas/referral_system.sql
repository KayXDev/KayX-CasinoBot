-- ═══════════════════════════════════════════════════════════════
-- 🎯 REFERRAL SYSTEM SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de referidos
CREATE TABLE IF NOT EXISTS referrals (
    user_id VARCHAR(20) PRIMARY KEY,
    referral_code VARCHAR(10) UNIQUE NOT NULL,
    referred_by VARCHAR(20) NULL,
    referrals_count INT DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    bonus_earned DECIMAL(15,2) DEFAULT 0.00,
    last_referral_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para optimizar consultas
    INDEX idx_referral_code (referral_code),
    INDEX idx_referred_by (referred_by),
    INDEX idx_referrals_count (referrals_count),
    
    -- Restricciones
    CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES referrals(user_id) ON DELETE SET NULL
);

-- Tabla de historial de bonuses reclamados
CREATE TABLE IF NOT EXISTS referral_bonus_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    milestone INT NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Evitar reclamar el mismo milestone dos veces
    UNIQUE KEY unique_milestone (user_id, milestone),
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_milestone (milestone),
    
    -- Restricción
    CONSTRAINT fk_bonus_user FOREIGN KEY (user_id) REFERENCES referrals(user_id) ON DELETE CASCADE
);

-- Insertar datos de ejemplo para testing (opcional)
-- INSERT INTO referrals (user_id, referral_code, referrals_count) VALUES 
-- ('123456789', 'FIRE123', 0),
-- ('987654321', 'CASH456', 0);

-- Consultas útiles para administración:
-- SELECT * FROM referrals ORDER BY referrals_count DESC LIMIT 10; -- Top referidores
-- SELECT * FROM referral_bonus_history WHERE user_id = '123456789'; -- Historial de bonuses
-- SELECT COUNT(*) as total_users, SUM(referrals_count) as total_referrals FROM referrals; -- Stats generales