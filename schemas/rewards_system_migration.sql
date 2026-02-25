-- ═══════════════════════════════════════════════════════════════
-- 📅 REWARDS SYSTEM DATABASE MIGRATION
-- ═══════════════════════════════════════════════════════════════
-- Agregar columnas para el sistema de recompensas diarias y semanales
-- ═══════════════════════════════════════════════════════════════

-- Agregar columnas para recompensas diarias y semanales
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_daily DATETIME NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_weekly DATETIME NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS daily_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_streak INT DEFAULT 0;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_last_daily ON users(last_daily);
CREATE INDEX IF NOT EXISTS idx_users_last_weekly ON users(last_weekly);

-- Verificar la estructura actualizada
DESCRIBE users;