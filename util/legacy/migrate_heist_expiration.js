import mysql from 'mysql2/promise';
import fs from 'fs';
import jsYaml from 'js-yaml';

async function runMigration() {
    try {
        console.log('📦 Loading configuration...');
        const configFile = fs.readFileSync('./config.yml', 'utf8');
        const config = jsYaml.load(configFile);

        console.log('🔌 Connecting to database...');
        const connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });

        console.log('📄 Reading migration file...');
        const migration = fs.readFileSync('./schemas/heist_items_expiration_migration.sql', 'utf8');
        const statements = migration.split(';').filter(s => s.trim().length > 0);

        console.log(`🚀 Executing ${statements.length} statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement.length === 0) continue;
            
            try {
                await connection.execute(statement);
                console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
            } catch (error) {
                if (error.message.includes('Duplicate column')) {
                    console.log(`⚠️  Statement ${i + 1}/${statements.length}: Column already exists, skipping`);
                } else {
                    console.log(`❌ Statement ${i + 1}/${statements.length} error:`, error.message);
                }
            }
        }

        await connection.end();
        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

runMigration();