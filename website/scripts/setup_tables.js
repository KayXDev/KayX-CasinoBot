const mysql = require('mysql2/promise');

async function createMissingTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔧 Creando tablas faltantes...');
    
    // Crear tabla crypto_portfolios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crypto_portfolios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(32) NOT NULL,
          crypto_id VARCHAR(10) NOT NULL,
          amount DECIMAL(20, 8) NOT NULL DEFAULT 0.00000000,
          total_invested DECIMAL(15, 2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_user_id (user_id),
          INDEX idx_crypto_id (crypto_id),
          UNIQUE KEY unique_user_crypto (user_id, crypto_id)
      )
    `);
    console.log('✅ Tabla crypto_portfolios creada');

    // Crear tabla command_logs
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS command_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(32) NOT NULL,
          command_name VARCHAR(50) NOT NULL,
          arguments TEXT,
          result VARCHAR(20) DEFAULT 'success',
          amount DECIMAL(15, 2) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_user_id (user_id),
          INDEX idx_command_name (command_name),
          INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Tabla command_logs creada');

    // Crear tabla referrals
    await connection.execute(`
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
    console.log('✅ Tabla referrals creada');

    console.log('🎉 ¡Todas las tablas han sido creadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createMissingTables();