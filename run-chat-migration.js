import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runChatMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔄 Ejecutando migración del sistema de chat...');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'website', 'schemas', 'admin_chat_migration.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Dividir por declaraciones SQL (separadas por ;)
    const statements = sqlContent.split(';').filter(statement => statement.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Ejecutando:', statement.substring(0, 60) + '...');
        await connection.execute(statement);
      }
    }

    console.log('✅ Migración del chat completada exitosamente');

    // Verificar que las tablas fueron creadas
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'casino_bot' 
      AND table_name LIKE 'admin_chat%'
    `);

    console.log('📋 Tablas del chat creadas:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
  } finally {
    await connection.end();
  }
}

runChatMigration();