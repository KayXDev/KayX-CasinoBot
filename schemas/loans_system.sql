-- ═══════════════════════════════════════════════════════════════
-- 💳 LOANS SYSTEM - Sistema de Préstamos Bancarios
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de préstamos
CREATE TABLE IF NOT EXISTS user_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    loan_type ENUM('personal', 'mortgage', 'commercial') NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL, -- 0.0800 = 8%
    term_days INT NOT NULL,
    daily_payment DECIMAL(10,2) NOT NULL,
    loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    payments_made INT DEFAULT 0,
    total_payments_required INT NOT NULL,
    collateral_property_id INT NULL, -- Para hipotecas
    loan_status ENUM('active', 'paid', 'defaulted', 'restructured') DEFAULT 'active',
    late_payments INT DEFAULT 0,
    total_interest_paid DECIMAL(15,2) DEFAULT 0.00,
    INDEX idx_user_loans (user_id),
    INDEX idx_loan_status (loan_status),
    INDEX idx_next_payment (next_payment_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (collateral_property_id) REFERENCES user_properties(id) ON DELETE SET NULL
);

-- Tabla de historial de pagos
CREATE TABLE IF NOT EXISTS loan_payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_type ENUM('regular', 'early', 'late', 'partial') DEFAULT 'regular',
    principal_portion DECIMAL(10,2) NOT NULL,
    interest_portion DECIMAL(10,2) NOT NULL,
    remaining_balance_after DECIMAL(15,2) NOT NULL,
    days_late INT DEFAULT 0,
    late_fee DECIMAL(8,2) DEFAULT 0.00,
    notes TEXT,
    INDEX idx_loan_payments (loan_id),
    INDEX idx_payment_date (payment_date),
    FOREIGN KEY (loan_id) REFERENCES user_loans(id) ON DELETE CASCADE
);

-- Tabla de puntuación crediticia
CREATE TABLE IF NOT EXISTS user_credit_scores (
    user_id VARCHAR(20) PRIMARY KEY,
    credit_score INT DEFAULT 650,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    total_loans_taken INT DEFAULT 0,
    total_loans_paid INT DEFAULT 0,
    on_time_payments INT DEFAULT 0,
    late_payments INT DEFAULT 0,
    defaulted_loans INT DEFAULT 0,
    total_borrowed DECIMAL(15,2) DEFAULT 0.00,
    total_repaid DECIMAL(15,2) DEFAULT 0.00,
    credit_history_length_days INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de ofertas de préstamo precalculadas
CREATE TABLE IF NOT EXISTS loan_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    loan_type ENUM('personal', 'mortgage', 'commercial') NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    max_term_days INT NOT NULL,
    offer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_date TIMESTAMP NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    special_conditions TEXT,
    INDEX idx_loan_offers (user_id),
    INDEX idx_offers_expiry (expires_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Trigger para actualizar credit score automáticamente
DELIMITER //
CREATE TRIGGER update_credit_score_after_payment
AFTER INSERT ON loan_payment_history
FOR EACH ROW
BEGIN
    DECLARE user_loan_id VARCHAR(20);
    DECLARE payment_late_days INT;
    
    -- Obtener user_id del préstamo
    SELECT user_id INTO user_loan_id 
    FROM user_loans 
    WHERE id = NEW.loan_id;
    
    -- Inicializar registro de credit score si no existe
    INSERT IGNORE INTO user_credit_scores (user_id) VALUES (user_loan_id);
    
    -- Actualizar estadísticas basadas en el pago
    IF NEW.days_late = 0 THEN
        -- Pago a tiempo: +10 puntos
        UPDATE user_credit_scores 
        SET credit_score = LEAST(850, credit_score + 10),
            on_time_payments = on_time_payments + 1,
            last_updated = NOW()
        WHERE user_id = user_loan_id;
    ELSEIF NEW.days_late <= 7 THEN
        -- Pago ligeramente tardío: -5 puntos
        UPDATE user_credit_scores 
        SET credit_score = GREATEST(300, credit_score - 5),
            late_payments = late_payments + 1,
            last_updated = NOW()
        WHERE user_id = user_loan_id;
    ELSE
        -- Pago muy tardío: -25 puntos
        UPDATE user_credit_scores 
        SET credit_score = GREATEST(300, credit_score - 25),
            late_payments = late_payments + 1,
            last_updated = NOW()
        WHERE user_id = user_loan_id;
    END IF;
END//
DELIMITER ;

SELECT 'Loans system tables and triggers created successfully!' as message;