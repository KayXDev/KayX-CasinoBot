-- Agregar columna online_members a la tabla server_requests
ALTER TABLE server_requests 
ADD COLUMN online_members INT DEFAULT 0 AFTER members;

-- Verificar que la columna se agregó correctamente
DESCRIBE server_requests;