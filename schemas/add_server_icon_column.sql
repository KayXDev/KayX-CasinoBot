-- Script SOLO para agregar la columna server_icon
-- Ejecuta estos comandos después de haber agregado online_members

USE casino_bot;

-- Verificar si existe columna image en server_requests
SHOW COLUMNS FROM server_requests LIKE 'image';

-- Agregar columna image si no existe
ALTER TABLE server_requests ADD COLUMN image TEXT AFTER online_members;

-- Agregar columna server_icon a server_requests (backup)
ALTER TABLE server_requests ADD COLUMN server_icon TEXT AFTER image;



-- Agregar columna server_icon a featured_servers  
ALTER TABLE featured_servers ADD COLUMN server_icon TEXT AFTER online_members;

-- Verificar que se agregaron correctamente
DESCRIBE server_requests;
DESCRIBE featured_servers;