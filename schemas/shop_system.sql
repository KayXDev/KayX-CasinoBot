-- Shop System Database Schema
CREATE DATABASE IF NOT EXISTS casino_bot;
USE casino_bot;

-- Products table to store available items
CREATE TABLE IF NOT EXISTS shop_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_usd DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval VARCHAR(50) DEFAULT NULL, -- 'monthly', 'yearly', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_active (is_active)
);

-- User purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  product_id INT NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  amount_paid DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (product_id) REFERENCES shop_products(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_active (is_active)
);

-- User premium features table
CREATE TABLE IF NOT EXISTS user_premium_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  granted_by_purchase_id INT,
  
  FOREIGN KEY (granted_by_purchase_id) REFERENCES user_purchases(id),
  UNIQUE KEY unique_user_feature (user_id, feature_name),
  INDEX idx_user_id (user_id),
  INDEX idx_active (is_active)
);

-- Insert default products
INSERT INTO shop_products (name, description, price_usd, category, features, is_recurring, recurring_interval) VALUES 
-- Premium Features
('VIP Membership', 'Exclusive benefits, higher limits, and special perks', 9.99, 'premium', 
 '["2x Daily Rewards", "VIP Support", "Exclusive Commands", "Special Badge"]', TRUE, 'monthly'),

('Premium Server Setup', 'Professional bot setup and configuration for your server', 19.99, 'premium', 
 '["Custom Configuration", "Channel Setup", "Role Integration", "24/7 Support"]', FALSE, NULL),

-- Cosmetics
('Custom Profile Themes', 'Personalize your profile with unique themes and colors', 2.99, 'cosmetics', 
 '["10+ Themes", "Custom Colors", "Animated Effects", "Exclusive Designs"]', FALSE, NULL),

('Badge Collection', 'Collect and display special badges on your profile', 1.99, 'cosmetics', 
 '["Rare Badges", "Achievement Boost", "Profile Showcase", "Collector Status"]', FALSE, NULL),

-- Boosters
('Luck Multiplier Pack', 'Increase your chances of winning in casino games', 4.99, 'boosters', 
 '["1.5x Win Rate", "7 Days Duration", "All Games", "Stackable"]', FALSE, NULL),

('Crypto Trader Pro', 'Advanced crypto trading tools and insights', 7.99, 'boosters', 
 '["Market Predictions", "Auto-Trading", "Advanced Charts", "Exclusive Alerts"]', FALSE, NULL);