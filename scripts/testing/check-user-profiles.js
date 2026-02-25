import mysql from 'mysql2/promise';

async function checkUserProfilesStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔍 Verificando estructura de user_profiles...');
    const [columns] = await connection.execute('DESCRIBE user_profiles');
    console.log('\n📋 Columnas disponibles en user_profiles:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });

    console.log('\n📊 Mostrando algunos datos de ejemplo:');
    const [rows] = await connection.execute('SELECT * FROM user_profiles LIMIT 3');
    console.log('Registros:', rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUserProfilesStructure();