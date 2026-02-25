-- ═══════════════════════════════════════════════════════════════
-- 🏢 PROPERTIES SYSTEM - Sistema de Propiedades Virtuales
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de propiedades
CREATE TABLE IF NOT EXISTS user_properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    property_type ENUM('casino', 'hotel', 'restaurant', 'store') NOT NULL,
    property_subtype VARCHAR(20) NOT NULL,
    property_name VARCHAR(100) NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    purchase_price DECIMAL(15,2) NOT NULL,
    current_level INT DEFAULT 1,
    max_level INT NOT NULL,
    base_income DECIMAL(10,2) NOT NULL,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    last_income_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    employees_count INT DEFAULT 0,
    marketing_level INT DEFAULT 0,
    maintenance_due TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_user_properties (user_id),
    INDEX idx_property_type (property_type),
    INDEX idx_income_time (last_income_time),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de empleados por propiedad
CREATE TABLE IF NOT EXISTS property_employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    employee_name VARCHAR(50) NOT NULL,
    employee_type ENUM('manager', 'security', 'cleaner', 'entertainer', 'chef', 'receptionist') NOT NULL,
    hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    salary_per_hour DECIMAL(8,2) NOT NULL,
    efficiency_bonus DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_property_employees (property_id),
    FOREIGN KEY (property_id) REFERENCES user_properties(id) ON DELETE CASCADE
);

-- Tabla de historial de ingresos
CREATE TABLE IF NOT EXISTS property_income_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    income_amount DECIMAL(10,2) NOT NULL,
    income_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    income_type ENUM('regular', 'bonus', 'event', 'employee_boost') DEFAULT 'regular',
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    notes TEXT,
    INDEX idx_property_income (property_id),
    INDEX idx_income_date (income_date),
    FOREIGN KEY (property_id) REFERENCES user_properties(id) ON DELETE CASCADE
);

-- Tabla de eventos de mercado inmobiliario
CREATE TABLE IF NOT EXISTS property_market_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    event_description TEXT NOT NULL,
    affected_property_types JSON, -- ['casino', 'hotel'] o null para todas
    price_multiplier DECIMAL(3,2) DEFAULT 1.00,
    income_multiplier DECIMAL(3,2) DEFAULT 1.00,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_market_events (start_time, end_time),
    INDEX idx_active_events (is_active)
);

-- Datos iniciales de ejemplo
INSERT IGNORE INTO property_market_events (event_name, event_description, affected_property_types, price_multiplier, income_multiplier, start_time, end_time) VALUES
('Casino Boom', 'Los casinos están en alta demanda debido a nuevas regulaciones favorables', '["casino"]', 1.20, 1.30, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
('Tourism Season', 'Temporada alta de turismo beneficia a hoteles y restaurantes', '["hotel", "restaurant"]', 1.15, 1.25, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY));

SELECT 'Properties system tables created successfully!' as message;