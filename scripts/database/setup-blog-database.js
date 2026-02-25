// setup-blog-database.js
// Script to create blog database tables

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupBlogDatabase() {
  try {
    // Read config
    const configPath = path.join(__dirname, 'config.yml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.database;

    console.log('Connecting to MySQL database...');
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });

    console.log('Reading blog schema...');
    const schemaPath = path.join(__dirname, 'schemas', 'blog_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating blog tables...');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim().startsWith('CREATE TABLE') || statement.trim().startsWith('INSERT')) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        await connection.execute(statement.trim());
      }
    }

    console.log('✅ Blog database tables created successfully!');
    console.log('Created tables:');
    console.log('  - blog_posts');
    console.log('  - blog_comments');
    console.log('  - blog_likes');
    console.log('  - blog_comment_likes');

    await connection.end();
  } catch (error) {
    console.error('❌ Error setting up blog database:', error.message);
    process.exit(1);
  }
}

setupBlogDatabase();