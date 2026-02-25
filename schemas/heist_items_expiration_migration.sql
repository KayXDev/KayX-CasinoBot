-- Migración para añadir sistema de expiración a items de heist
-- Fecha: 2025-10-08
-- Versión: 1.4

-- Añadir campo de expiración a equipment de heist
ALTER TABLE user_heist_equipment 
ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL AFTER purchase_date;

-- Añadir campo de expiración a consumibles de heist
ALTER TABLE user_heist_consumables 
ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL AFTER last_updated;

-- Actualizar items existentes para que expiren en 1 hora desde ahora
UPDATE user_heist_equipment 
SET expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR) 
WHERE expires_at IS NULL;

UPDATE user_heist_consumables 
SET expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR) 
WHERE expires_at IS NULL AND quantity > 0;