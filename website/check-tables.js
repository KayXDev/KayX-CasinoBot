// Script para verificar la estructura de las tablas
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Cambia esto por tu contraseña
  database: 'casino_bot',
  port: 3306
};

async function checkTables() {
  let connection = null;
  
  try {
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Verificando estructura de la tabla users...');
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Columnas de users:', columns);
    
    console.log('\nVerificando primeros registros...');
    const [rows] = await connection.execute('SELECT * FROM users LIMIT 1');
    console.log('Primer usuario:', rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada.');
    }
  }
}

checkTables();