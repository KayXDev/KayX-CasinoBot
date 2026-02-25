-- Migración para el sistema de chat entre administradores
-- Fecha: 2025-11-08

CREATE TABLE IF NOT EXISTS admin_chat (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    message TEXT NOT NULL,
    user_type ENUM('owner', 'server_admin') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to INT NULL,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_user_type (user_type),
    FOREIGN KEY (reply_to) REFERENCES admin_chat(id) ON DELETE SET NULL
);

-- Crear tabla para gestionar conexiones activas del chat
CREATE TABLE IF NOT EXISTS admin_chat_connections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    user_type ENUM('owner', 'server_admin') NOT NULL,
    socket_id VARCHAR(255) NOT NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_socket (user_id, socket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
);

-- Crear tabla para notificaciones del chat
CREATE TABLE IF NOT EXISTS admin_chat_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    message_id INT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (message_id) REFERENCES admin_chat(id) ON DELETE CASCADE
);