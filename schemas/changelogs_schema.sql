-- Tabla para changelogs del bot
CREATE TABLE IF NOT EXISTS changelogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    type ENUM('major', 'minor', 'patch') DEFAULT 'minor',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    featured BOOLEAN DEFAULT FALSE,
    changes JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_featured (featured),
    INDEX idx_type (type)
);

-- Agregar algunos datos de ejemplo (opcional, remover después)
-- INSERT INTO changelogs (version, date, type, title, description, featured, changes) VALUES 
-- ('1.0.0', '2025-01-01', 'major', 'Lanzamiento Inicial', 'Primera versión del casino bot con funcionalidades básicas', true, 
-- '[{"type":"new","items":["Sistema de casino básico","Comandos de blackjack","Sistema de balance de usuarios"]}]');