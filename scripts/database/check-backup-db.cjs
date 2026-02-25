const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function checkBackupTables() {
  try {
    // Cargar configuración desde el archivo config.yml del bot
    const configPath = path.join(__dirname, 'config.yml');
    let config = {};

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(fileContents);
    } catch (error) {
      console.error('Error loading config.yml:', error);
      config = {
        database: {
          host: 'localhost',
          user: 'root',
          password: '',
          database: 'casino_bot'
        }
      };
    }

    const dbConfig = {
      host: config.database?.host || 'localhost',
      user: config.database?.user || 'root',
      password: config.database?.password || '',
      database: config.database?.database || 'casino_bot',
    };

    console.log('Conectando a la base de datos...');
    const connection = await mysql.createConnection(dbConfig);

    // Verificar tabla backup_requests
    console.log('\n📋 Verificando tabla backup_requests...');
    try {
      const [backupRequests] = await connection.execute('SELECT * FROM backup_requests ORDER BY created_at DESC LIMIT 5');
      console.log(`Registros encontrados: ${backupRequests.length}`);
      backupRequests.forEach(req => {
        console.log(`   • ID: ${req.request_id} | Estado: ${req.status} | Fecha: ${req.created_at}`);
      });
    } catch (error) {
      console.log('   ❌ Error accediendo a backup_requests:', error.message);
    }

    // Verificar tabla server_backups
    console.log('\n📋 Verificando tabla server_backups...');
    try {
      const [serverBackups] = await connection.execute('SELECT * FROM server_backups ORDER BY created_at DESC LIMIT 5');
      console.log(`Registros encontrados: ${serverBackups.length}`);
      serverBackups.forEach(backup => {
        console.log(`   • ID: ${backup.backup_id || backup.id} | Guild: ${backup.guild_id} | Nombre: ${backup.name} | Fecha: ${backup.created_at}`);
      });
    } catch (error) {
      console.log('   ❌ Error accediendo a server_backups:', error.message);
    }

    // Mostrar estructura de server_backups
    console.log('\n🔍 Estructura de server_backups:');
    try {
      const [columns] = await connection.execute('DESCRIBE server_backups');
      columns.forEach(col => {
        console.log(`   • ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key}`);
      });
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura:', error.message);
    }

    // Probar inserción manual
    console.log('\n🧪 Probando inserción manual...');
    try {
      const testId = `test_${Date.now()}`;
      const result = await connection.execute(`
        INSERT INTO server_backups (
          backup_id,
          guild_id,
          name,
          created_at,
          data
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        testId,
        'test_guild',
        'Test Backup Manual',
        new Date(),
        JSON.stringify({ test: true })
      ]);
      
      console.log(`   ✅ Inserción exitosa. ID generado:`, result[0].insertId);
      
      // Verificar que se insertó
      const [verify] = await connection.execute('SELECT * FROM server_backups WHERE backup_id = ?', [testId]);
      console.log(`   ✅ Verificación: ${verify.length} registro(s) encontrado(s)`);
      
    } catch (error) {
      console.log('   ❌ Error en inserción manual:', error.message);
    }

    await connection.end();
    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
checkBackupTables();