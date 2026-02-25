-- Tabla para cooldowns de trading por usuario
CREATE TABLE IF NOT EXISTS crypto_trading_cooldowns (
    user_id VARCHAR(20) PRIMARY KEY,
    last_trade TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);