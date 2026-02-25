// Migración para items de robo
import mysql from 'mysql2/promise';
import fs from 'fs';
import jsYaml from 'js-yaml';

// Leer configuración
const configFile = fs.readFileSync('./config.yml', 'utf8');
const config = jsYaml.load(configFile);

async function runMigration() {
    const connection = await mysql.createConnection({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        multipleStatements: true
    });

    try {
        console.log('🔄 Ejecutando migración para items de robo...');
        
        // Crear tabla de equipamiento
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_heist_equipment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                item_type ENUM('lockpick_kit', 'hacking_laptop', 'stealth_suit', 'decoder_device', 'master_thief_kit') NOT NULL,
                purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                uses_remaining INT DEFAULT -1,
                UNIQUE KEY unique_user_item (user_id, item_type),
                INDEX idx_user_active (user_id, is_active)
            )
        `);
        console.log('✅ Tabla user_heist_equipment creada');

        // Crear tabla de consumibles
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_heist_consumables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                item_type ENUM('adrenaline_shot', 'focus_pills', 'intel_report', 'getaway_car', 'fake_id') NOT NULL,
                quantity INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_consumable (user_id, item_type),
                INDEX idx_user_id (user_id)
            )
        `);
        console.log('✅ Tabla user_heist_consumables creada');

        // Crear tabla de historial
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS heist_item_usage (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                bank_type ENUM('local', 'regional', 'national', 'reserve') NOT NULL,
                items_used JSON,
                success BOOLEAN NOT NULL,
                bonus_applied DECIMAL(4,3) DEFAULT 0.000,
                usage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_date (user_id, usage_date),
                INDEX idx_success (success)
            )
        `);
        console.log('✅ Tabla heist_item_usage creada');

        // Crear tabla shop_inventory si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shop_inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                quantity INT DEFAULT 1,
                purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                expiry_date TIMESTAMP NULL,
                heist_bonus_active BOOLEAN DEFAULT FALSE,
                heist_bonus_expiry TIMESTAMP NULL,
                heist_bonus_type VARCHAR(50) NULL,
                UNIQUE KEY unique_user_item (user_id, item_id),
                INDEX idx_user_active (user_id, is_active),
                INDEX idx_expiry (expiry_date)
            )
        `);
        console.log('✅ Tabla shop_inventory creada/verificada');

        console.log('✅ Migración completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en migración:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();