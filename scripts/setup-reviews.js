import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casino_bot',
    charset: 'utf8mb4'
  }

  try {
    console.log('🔄 Conectando a la base de datos...')
    const connection = await mysql.createConnection(dbConfig)
    
    console.log('📖 Leyendo archivo de migración...')
    const migrationFile = path.join(__dirname, '..', 'schemas', 'reviews_system_migration.sql')
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8')
    
    // Dividir el archivo en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`🚀 Ejecutando ${statements.length} statements...`)
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement)
        console.log('✅ Statement ejecutado correctamente')
      }
    }
    
    console.log('🎉 Migración completada exitosamente!')
    console.log('📊 Verificando tablas creadas...')
    
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'review%'"
    )
    
    console.log('Tablas de reviews encontradas:', tables)
    
    const [reviewCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM reviews"
    )
    
    console.log(`📝 Total de reviews en la base de datos: ${reviewCount[0].count}`)
    
    await connection.end()
    console.log('✨ ¡Sistema de reviews listo para usar!')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  }
}

// Ejecutar solo si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export default runMigration