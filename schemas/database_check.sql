-- Script de verificación rápida para la base de datos
-- Ejecutar en MySQL para verificar que todo está listo

-- 1. Verificar que existe la base de datos
SHOW DATABASES LIKE 'casino_bot';

-- 2. Usar la base de datos
USE casino_bot;

-- 3. Verificar tablas existentes
SHOW TABLES;

-- 4. Verificar estructura de tabla users
DESCRIBE users;

-- 5. Ver algunos usuarios de ejemplo
SELECT user_id, hand, bank FROM users LIMIT 5;

-- 6. Crear tabla de compras si no existe
CREATE TABLE IF NOT EXISTS user_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Verificar tabla de compras
DESCRIBE user_purchases;

-- 8. Mostrar compras recientes (si las hay)
SELECT * FROM user_purchases ORDER BY created_at DESC LIMIT 5;