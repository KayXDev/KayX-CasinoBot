-- ═══════════════════════════════════════════════════════════════
-- 👥 FRIENDS SYSTEM DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de amistades
CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    friend_id VARCHAR(20) NOT NULL,
    status ENUM('pending', 'accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    
    -- Índices para mejorar rendimiento
    INDEX idx_user_id (user_id),
    INDEX idx_friend_id (friend_id),
    INDEX idx_status (status),
    
    -- Evitar duplicados y auto-amistad
    UNIQUE KEY unique_friendship (user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 📊 VIEWS PARA CONSULTAS FRECUENTES
-- ═══════════════════════════════════════════════════════════════

-- Vista para amistades aceptadas (bidireccionales)
CREATE OR REPLACE VIEW accepted_friends AS
SELECT 
    f1.user_id,
    f1.friend_id,
    f1.accepted_at
FROM friends f1
WHERE f1.status = 'accepted'
  AND EXISTS (
    SELECT 1 FROM friends f2 
    WHERE f2.user_id = f1.friend_id 
    AND f2.friend_id = f1.user_id 
    AND f2.status = 'accepted'
  );

-- Vista para solicitudes pendientes recibidas
CREATE OR REPLACE VIEW pending_requests AS
SELECT 
    friend_id as user_id,
    user_id as requester_id,
    created_at
FROM friends 
WHERE status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM friends f2 
    WHERE f2.user_id = friends.friend_id 
    AND f2.friend_id = friends.user_id
  );

-- ═══════════════════════════════════════════════════════════════
-- 🔧 PROCEDURES PARA OPERACIONES COMUNES
-- ═══════════════════════════════════════════════════════════════

DELIMITER //

-- Procedimiento para enviar solicitud de amistad
CREATE PROCEDURE IF NOT EXISTS SendFriendRequest(
    IN sender_id VARCHAR(20),
    IN receiver_id VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insertar solicitud si no existe
    INSERT IGNORE INTO friends (user_id, friend_id, status) 
    VALUES (sender_id, receiver_id, 'pending');
    
    COMMIT;
END //

-- Procedimiento para aceptar solicitud de amistad
CREATE PROCEDURE IF NOT EXISTS AcceptFriendRequest(
    IN accepter_id VARCHAR(20),
    IN requester_id VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Actualizar solicitud existente a aceptada
    UPDATE friends 
    SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
    WHERE user_id = requester_id AND friend_id = accepter_id AND status = 'pending';
    
    -- Crear la relación bidireccional
    INSERT INTO friends (user_id, friend_id, status, accepted_at) 
    VALUES (accepter_id, requester_id, 'accepted', CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE 
        status = 'accepted', 
        accepted_at = CURRENT_TIMESTAMP;
    
    COMMIT;
END //

-- Procedimiento para eliminar amistad
CREATE PROCEDURE IF NOT EXISTS RemoveFriendship(
    IN user_id VARCHAR(20),
    IN friend_id VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Eliminar ambas direcciones de la amistad
    DELETE FROM friends 
    WHERE (user_id = user_id AND friend_id = friend_id) 
       OR (user_id = friend_id AND friend_id = user_id);
    
    COMMIT;
END //

DELIMITER ;

-- ═══════════════════════════════════════════════════════════════
-- 📋 DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- ═══════════════════════════════════════════════════════════════

-- INSERT INTO friends (user_id, friend_id, status) VALUES 
-- ('123456789', '987654321', 'pending'),
-- ('111111111', '222222222', 'accepted'),
-- ('222222222', '111111111', 'accepted');