-- Script para agregar la columna online_members
-- Ejecuta estos comandos en tu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)

USE casino_bot;

-- Agregar la columna online_members a la tabla server_requests
ALTER TABLE server_requests ADD COLUMN online_members INT DEFAULT 0 AFTER members;

-- Agregar columna para el ícono del servidor
ALTER TABLE server_requests ADD COLUMN server_icon TEXT AFTER online_members;

-- Verificar que se agregó correctamente
DESCRIBE server_requests;

-- También agregar a featured_servers si no la tiene
-- (Verifica primero si existe)
SHOW COLUMNS FROM featured_servers LIKE 'online_members';

-- Si no existe en featured_servers, agrégala también:
ALTER TABLE featured_servers ADD COLUMN online_members INT DEFAULT 0 AFTER members;

-- Agregar columna para el ícono del servidor en featured_servers
ALTER TABLE featured_servers ADD COLUMN server_icon TEXT AFTER online_members;

-- Agregar columna para rastrear última actualización
ALTER TABLE featured_servers ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Verificar cambios en featured_servers
DESCRIBE featured_servers;