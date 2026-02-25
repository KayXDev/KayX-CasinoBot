#!/usr/bin/env node
// Script de emergencia para crear las tablas de heist manualmente
// Usar en caso de que el sistema de inicialización automática falle

import { pool, ensureHeistTables } from '../db.js';

async function createHeistTablesManually() {
  try {
    console.log('🚀 Starting manual heist tables creation...');
    console.log('📊 Database connection:', {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'casino_bot'
    });
    
    // Verificar conexión a la base de datos
    console.log('🔗 Testing database connection...');
    const [result] = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Crear las tablas de heist
    console.log('🏗️ Creating heist tables...');
    await ensureHeistTables();
    
    // Verificar que las tablas se crearon
    console.log('🔍 Verifying table creation...');
    const [tables] = await pool.query("SHOW TABLES LIKE '%heist%'");
    console.log('📋 Heist tables found:', tables.map(t => Object.values(t)[0]));
    
    // Contar todas las tablas
    const [allTables] = await pool.query('SHOW TABLES');
    console.log(`📊 Total tables in database: ${allTables.length}`);
    
    console.log('🎉 Manual heist tables creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating heist tables manually:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await pool.end();
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createHeistTablesManually();
}

export { createHeistTablesManually };