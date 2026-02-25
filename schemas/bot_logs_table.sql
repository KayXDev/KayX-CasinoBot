-- Tabla para almacenar todos los logs del bot de casino
CREATE TABLE IF NOT EXISTS bot_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level ENUM('error', 'warn', 'info', 'debug') NOT NULL DEFAULT 'info',
    category ENUM('command', 'system', 'database', 'error', 'casino', 'crypto', 'admin') NOT NULL DEFAULT 'system',
    message TEXT NOT NULL,
    user_id VARCHAR(20) NULL,
    username VARCHAR(50) NULL,
    command_name VARCHAR(50) NULL,
    server_id VARCHAR(20) NULL,
    channel_id VARCHAR(20) NULL,
    details JSON NULL,
    error_stack TEXT NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_level (level),
    INDEX idx_category (category),
    INDEX idx_user (user_id),
    INDEX idx_command (command_name)
);

-- Insertar algunos logs de ejemplo para probar
INSERT INTO bot_logs (level, category, message, user_id, username, command_name, details) VALUES
('info', 'command', 'Usuario ejecutó comando de blackjack', '123456789', 'TestUser', 'blackjack', '{"bet": 100, "result": "win", "amount": 200}'),
('info', 'command', 'Usuario consultó su balance', '987654321', 'PlayerTwo', 'balance', '{"balance": 5000}'),
('error', 'casino', 'Error al procesar apuesta en ruleta', '123456789', 'TestUser', 'ruleta', '{"error": "Insufficient funds", "bet": 1000}'),
('info', 'system', 'Bot iniciado correctamente', NULL, NULL, NULL, '{"version": "1.0.0", "uptime": 0}'),
('warn', 'database', 'Conexión a base de datos lenta', NULL, NULL, NULL, '{"response_time": "2.5s"}');