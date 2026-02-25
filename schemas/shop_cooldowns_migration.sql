-- Shop Purchase Cooldowns Migration
-- This table tracks when users last purchased specific items to enforce cooldowns

-- Create table for shop purchase cooldowns
CREATE TABLE IF NOT EXISTS user_shop_cooldowns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    last_purchase TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_item (user_id, item_id),
    INDEX idx_expires (expires_at),
    UNIQUE KEY unique_user_item (user_id, item_id)
);

-- Add some useful indexes for performance
ALTER TABLE user_shop_cooldowns 
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_item_id (item_id);

-- Create a cleanup event to remove expired cooldowns (runs every hour)
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_shop_cooldowns
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    DELETE FROM user_shop_cooldowns WHERE expires_at < NOW();
END //
DELIMITER ;

-- Enable the event scheduler if not already enabled
SET GLOBAL event_scheduler = ON;