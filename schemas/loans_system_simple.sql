-- ═══════════════════════════════════════════════════════════════
-- 🏦 SISTEMA DE PRÉSTAMOS Y CRÉDITO - Esquema Simplificado
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de préstamos de usuarios
CREATE TABLE IF NOT EXISTS user_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    loan_type ENUM('personal', 'business', 'mortgage', 'emergency') NOT NULL,
    original_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL, -- 0.0800 = 8%
    term_days INT NOT NULL,
    daily_payment DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_payment_date TIMESTAMP NULL,
    last_payment_date TIMESTAMP NULL,
    completion_date TIMESTAMP NULL,
    status ENUM('active', 'completed', 'defaulted') DEFAULT 'active',
    INDEX idx_user_loans (user_id),
    INDEX idx_loan_status (status),
    INDEX idx_payment_dates (next_payment_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de historial de pagos
CREATE TABLE IF NOT EXISTS loan_payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remaining_balance_after DECIMAL(15,2) NOT NULL,
    days_late INT DEFAULT 0,
    penalty_applied DECIMAL(8,2) DEFAULT 0.00,
    INDEX idx_loan_payments (loan_id),
    INDEX idx_payment_dates (payment_date),
    FOREIGN KEY (loan_id) REFERENCES user_loans(id) ON DELETE CASCADE
);

-- Tabla de credit scores de usuarios
CREATE TABLE IF NOT EXISTS user_credit_scores (
    user_id VARCHAR(20) PRIMARY KEY,
    credit_score INT DEFAULT 650,
    payment_history DECIMAL(3,2) DEFAULT 1.00, -- 0.00 a 1.00
    debt_ratio DECIMAL(3,2) DEFAULT 0.00,
    credit_age INT DEFAULT 1, -- Meses con crédito
    on_time_payments INT DEFAULT 0,
    late_payments INT DEFAULT 0,
    defaulted_loans INT DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_credit_score (credit_score),
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

SELECT 'Loans system tables created successfully!' as message;