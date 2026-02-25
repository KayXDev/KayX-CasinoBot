import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateReferralSystem() {
  console.log('🎯 Starting referral system migration...');
  
  try {
    // Crear tabla referrals directamente
    console.log('📊 Creating referrals table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        user_id VARCHAR(20) PRIMARY KEY,
        referral_code VARCHAR(10) UNIQUE NOT NULL,
        referred_by VARCHAR(20) NULL,
        referrals_count INT DEFAULT 0,
        total_earned DECIMAL(15,2) DEFAULT 0.00,
        bonus_earned DECIMAL(15,2) DEFAULT 0.00,
        last_referral_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_referral_code (referral_code),
        INDEX idx_referred_by (referred_by),
        INDEX idx_referrals_count (referrals_count)
      )
    `);
    
    console.log('� Creating referral_bonus_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_bonus_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(20) NOT NULL,
        milestone INT NOT NULL,
        bonus_amount DECIMAL(15,2) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_milestone (user_id, milestone),
        INDEX idx_user_id (user_id),
        INDEX idx_milestone (milestone)
      )
    `);
    
    console.log('✅ Referral system migration completed successfully!');
    
    // Verificar que las tablas se crearon
    const [tables] = await pool.query("SHOW TABLES LIKE 'referral%'");
    console.log(`📋 Created tables: ${tables.map(t => Object.values(t)[0]).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Solo ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateReferralSystem()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateReferralSystem };