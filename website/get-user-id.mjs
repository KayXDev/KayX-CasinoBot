// get-user-id.mjs
// Script to get your Discord user ID from the database

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function getUserId() {
  try {
    let dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    };

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      dbConfig = {
        host: url.hostname,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1)
      };
    }

    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);

    // Get blog posts by neeegroo to find the user ID
    console.log('Finding neeegroo user ID from blog posts...');
    const [posts] = await connection.execute(`
      SELECT DISTINCT author_id, author_name
      FROM blog_posts 
      WHERE author_name = 'neeegroo'
    `);
    
    if (Array.isArray(posts) && posts.length > 0) {
      console.log('Found user:');
      console.table(posts);
      return posts[0].author_id;
    } else {
      console.log('No posts found by neeegroo. Let me check all users...');
      
      // Check all unique authors
      const [allAuthors] = await connection.execute(`
        SELECT DISTINCT author_id, author_name
        FROM blog_posts 
        ORDER BY author_name
      `);
      
      console.log('All blog authors:');
      console.table(allAuthors);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getUserId();