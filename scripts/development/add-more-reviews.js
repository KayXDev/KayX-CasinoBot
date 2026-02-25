import mysql from 'mysql2/promise';

async function addMoreReviews() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔍 Obteniendo usuarios disponibles...');
    const [users] = await connection.execute(
      'SELECT discord_id FROM user_profiles LIMIT 10'
    );

    console.log('👥 Usuarios encontrados:', users.length);

    // Crear más reviews variadas
    const newReviews = [
      {
        user_id: users[0]?.discord_id || '388422519553654786',
        rating: 5,
        title: 'Sistema de cripto increíble',
        content: 'El trading de criptomonedas es súper realista y he ganado muchísimas monedas. El sistema está muy bien balanceado y es adictivo.',
        likes: 23
      },
      {
        user_id: users[1]?.discord_id || '390873542448644106', 
        rating: 4,
        title: 'Muy entretenido',
        content: 'Los juegos son muy divertidos, especialmente el blackjack y la ruleta. A veces tarda un poco en responder pero en general excelente.',
        likes: 18
      },
      {
        user_id: users[2]?.discord_id || users[0]?.discord_id,
        rating: 5,
        title: '¡No puedo parar de jugar!',
        content: 'Este bot ha revolucionado nuestro servidor. Los miembros pasan horas jugando y compitiendo entre ellos. 100% recomendado.',
        likes: 31
      }
    ];

    console.log('📝 Agregando nuevas reviews...');
    
    for (const review of newReviews) {
      try {
        await connection.execute(
          'INSERT INTO reviews (user_id, rating, title, content, likes) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), title=VALUES(title), content=VALUES(content), likes=VALUES(likes)',
          [review.user_id, review.rating, review.title, review.content, review.likes]
        );
        console.log(`✅ Review agregada: "${review.title}"`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Review actualizada: "${review.title}"`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }

    // Verificar resultados
    const [reviewCount] = await connection.execute('SELECT COUNT(*) as count FROM reviews');
    console.log(`🎉 Total reviews en la base de datos: ${reviewCount[0].count}`);

    // Mostrar las reviews más recientes
    console.log('\n📋 Reviews recientes:');
    const [recentReviews] = await connection.execute(`
      SELECT 
        r.rating,
        r.title,
        LEFT(r.content, 50) as preview,
        r.likes,
        COALESCE(u.custom_username, u.display_name, 'Usuario') as username,
        u.is_verified as verified
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    recentReviews.forEach((review, index) => {
      const verified = review.verified ? ' ✅' : '';
      console.log(`${index + 1}. "${review.title}" por ${review.username}${verified} (${review.rating}⭐, ${review.likes} likes)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addMoreReviews();