// test-db-connection.js
// Script to test database connection from website directory

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Parse DATABASE_URL if available, otherwise use individual env vars
    let dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    };

    if (process.env.DATABASE_URL) {
      // Parse mysql://user:password@host:port/database
      const url = new URL(process.env.DATABASE_URL);
      dbConfig = {
        host: url.hostname,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1) // Remove leading slash
      };
    }

    console.log('Connection config:', { 
      host: dbConfig.host, 
      user: dbConfig.user, 
      database: dbConfig.database 
    });

    const connection = await mysql.createConnection(dbConfig);

    console.log('✅ Connected to database successfully!');

    // Check if blog tables exist
    console.log('\nChecking for blog tables...');
    
    const tables = ['blog_posts', 'blog_comments', 'blog_likes', 'blog_comment_likes'];
    
    for (const tableName of tables) {
      try {
        const [rows] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
        if (Array.isArray(rows) && rows.length > 0) {
          console.log(`✅ Table ${tableName} exists`);
          
          // Get row count
          const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = Array.isArray(countResult) && countResult.length > 0 ? countResult[0].count : 0;
          console.log(`   └─ Rows: ${count}`);
        } else {
          console.log(`❌ Table ${tableName} does NOT exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking table ${tableName}:`, error.message);
      }
    }

    // Show all tables in database
    console.log('\nAll tables in casino_bot database:');
    const [allTables] = await connection.execute('SHOW TABLES');
    console.log(allTables);

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Connection details:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('User:', process.env.DB_USER || 'root');
    console.log('Database:', process.env.DB_NAME || 'casino_bot');
  }
}

testConnection();