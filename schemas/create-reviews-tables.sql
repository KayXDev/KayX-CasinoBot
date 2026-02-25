-- Ejecutar este SQL directamente en tu cliente MySQL
-- Para crear las tablas del sistema de reviews

USE casino_bot;

-- Tabla principal de reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at),
    
    -- Asegurar que cada usuario solo tenga una review
    UNIQUE KEY unique_user_review (user_id)
);

-- Tabla de likes en reviews
CREATE TABLE IF NOT EXISTS review_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    review_id INT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_review_id (review_id),
    INDEX idx_user_id (user_id),
    
    -- Constraints
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    
    -- Asegurar que cada usuario solo pueda dar like una vez por review
    UNIQUE KEY unique_user_like (review_id, user_id)
);

-- Insertar algunas reviews de ejemplo
INSERT IGNORE INTO reviews (user_id, rating, title, content, likes) VALUES
('388422519553654786', 5, '¡Increíble bot de casino!', 'He estado usando este bot por meses y es simplemente fantástico. Los juegos son emocionantes y el sistema es muy justo. Definitivamente recomendado para cualquier servidor de Discord.', 15),
('123456789012345678', 5, 'Mejor que un casino real', 'La experiencia que ofrece este bot es increíble. Me encanta la variedad de juegos y las recompensas diarias. El soporte también es excelente.', 8),
('234567890123456789', 4, 'Muy buena experiencia', 'Bot muy completo con muchas funciones. Algunas veces puede ser un poco lento pero en general muy satisfecho con la experiencia.', 12),
('345678901234567890', 5, 'Adictivo y divertido', 'No puedo parar de jugar! Los mini-juegos son super entretenidos y el sistema de monedas está muy bien balanceado. 10/10', 20),
('456789012345678901', 4, 'Gran variedad de juegos', 'Me gusta mucho la cantidad de juegos disponibles. El blackjack y la ruleta son mis favoritos. Solo le falta mejorar un poco la interfaz.', 6);

-- Verificar que las tablas se crearon correctamente
SHOW TABLES LIKE '%review%';

-- Verificar los datos insertados
SELECT COUNT(*) as total_reviews FROM reviews;
SELECT COUNT(*) as total_likes FROM review_likes;

-- Ver las reviews creadas
SELECT 
    r.id, 
    r.user_id, 
    r.rating, 
    r.title, 
    LEFT(r.content, 50) as content_preview,
    r.likes,
    r.created_at
FROM reviews r 
ORDER BY r.created_at DESC;