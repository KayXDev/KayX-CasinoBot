import mysql from 'mysql2/promise';

async function checkReviewData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔍 Verificando datos de reviews...');
    
    const [reviews] = await connection.execute(`
      SELECT 
        r.id,
        r.user_id,
        r.rating,
        r.title,
        r.content,
        r.created_at,
        r.likes,
        COALESCE(u.custom_username, u.display_name, 'Usuario') as username,
        u.avatar_url as avatar,
        u.is_verified as verified
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      ORDER BY r.created_at DESC
    `);

    console.log('\n📋 Datos de reviews:');
    reviews.forEach((review, index) => {
      console.log(`${index + 1}. Review ID: ${review.id}`);
      console.log(`   Usuario: ${review.username}`);
      console.log(`   Verificado: ${review.verified} (tipo: ${typeof review.verified})`);
      console.log(`   Avatar: ${review.avatar ? 'Tiene avatar' : 'Sin avatar'}`);
      console.log(`   Rating: ${review.rating}`);
      console.log(`   Título: ${review.title}`);
      console.log('---');
    });

    // También verificar la estructura exacta de user_profiles
    console.log('\n🔍 Verificando estructura de is_verified:');
    const [userCheck] = await connection.execute(
      'SELECT discord_id, custom_username, is_verified FROM user_profiles WHERE is_verified = 1 LIMIT 1'
    );
    
    if (userCheck.length > 0) {
      console.log('Usuario verificado encontrado:', userCheck[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkReviewData();