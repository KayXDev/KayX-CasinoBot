-- Tabla de notificaciones web
CREATE TABLE IF NOT EXISTS web_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL COMMENT 'Usuario que RECIBE la notificación',
    actor_id VARCHAR(50) NULL COMMENT 'Usuario que GENERA la acción (NULL para sistema)',
    type ENUM('blog_post', 'changelog', 'review', 'like', 'comment', 'system') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(300) NOT NULL,
    link VARCHAR(200) NULL COMMENT 'URL donde dirigir al hacer click',
    metadata JSON NULL COMMENT 'Datos adicionales (post_id, comment_id, etc)',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de configuración de notificaciones por usuario
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id VARCHAR(50) PRIMARY KEY,
    blog_notifications BOOLEAN DEFAULT TRUE COMMENT 'Nuevos posts de blog',
    changelog_notifications BOOLEAN DEFAULT TRUE COMMENT 'Actualizaciones del bot',
    review_notifications BOOLEAN DEFAULT TRUE COMMENT 'Nuevas reviews',
    like_notifications BOOLEAN DEFAULT TRUE COMMENT 'Likes en contenido',
    comment_notifications BOOLEAN DEFAULT TRUE COMMENT 'Comentarios en posts',
    system_notifications BOOLEAN DEFAULT TRUE COMMENT 'Notificaciones del sistema',
    email_notifications BOOLEAN DEFAULT FALSE COMMENT 'Enviar por email también',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices adicionales para optimización
ALTER TABLE web_notifications 
ADD CONSTRAINT fk_notifications_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insertar configuración por defecto para usuarios existentes
INSERT IGNORE INTO notification_settings (user_id) 
SELECT DISTINCT id FROM users;