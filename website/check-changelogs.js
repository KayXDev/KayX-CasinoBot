const mysql = require('mysql2/promise');

async function checkChangelogs() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    });

    console.log('🔍 Verificando changelogs en la base de datos...\n');

    // Verificar si la tabla existe
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'casino_bot' AND table_name = 'changelogs'
    `);

    if (tableCheck[0].count === 0) {
      console.log('❌ La tabla changelogs no existe!');
      console.log('💡 Necesitas crear la tabla primero');
      await connection.end();
      return;
    }

    // Obtener todos los changelogs
    const [changelogs] = await connection.execute(`
      SELECT id, version, date, title, featured, changes, created_at
      FROM changelogs 
      ORDER BY date DESC, created_at DESC
    `);

    if (changelogs.length === 0) {
      console.log('📭 No se encontraron changelogs en la base de datos');
    } else {
      console.log(`📊 Se encontraron ${changelogs.length} changelogs:`);
      changelogs.forEach((changelog, index) => {
        console.log(`\n${index + 1}. ID: ${changelog.id}`);
        console.log(`   Versión: ${changelog.version}`);
        console.log(`   Fecha: ${changelog.date}`);
        console.log(`   Título: ${changelog.title}`);
        console.log(`   Featured: ${changelog.featured}`);
        console.log(`   Creado: ${changelog.created_at}`);
        
        // Parsear changes si es string
        let changes;
        try {
          changes = typeof changelog.changes === 'string' 
            ? JSON.parse(changelog.changes) 
            : changelog.changes;
          
          if (changes) {
            if (changes.new) console.log(`   • Nuevas: ${changes.new.length} items`);
            if (changes.improved) console.log(`   • Mejoras: ${changes.improved.length} items`);
            if (changes.fixed) console.log(`   • Correcciones: ${changes.fixed.length} items`);
          }
        } catch (e) {
          console.log(`   ⚠️ Error parseando changes: ${e.message}`);
        }
      });
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error verificando changelogs:', error.message);
  }
}

checkChangelogs();