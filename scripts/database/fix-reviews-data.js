import mysql from 'mysql2/promise';

async function addReviewsWithRealUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🔍 Obteniendo usuarios reales...');
    const [users] = await connection.execute(
      'SELECT discord_id FROM user_profiles LIMIT 5'
    );

    console.log('👥 Usuarios encontrados:', users.map(u => u.discord_id));

    // Limpiar reviews existentes
    console.log('🧹 Limpiando reviews existentes...');
    await connection.execute('DELETE FROM review_likes');
    await connection.execute('DELETE FROM reviews');

    // Crear reviews con usuarios reales
    console.log('📝 Insertando reviews con usuarios reales...');
    
    if (users.length > 0) {
      const reviewsData = [
        {
          user_id: users[0].discord_id,
          rating: 5,
          title: '¡Increíble bot de casino!',
          content: 'He estado usando este bot por meses y es simplemente fantástico. Los juegos son emocionantes y el sistema es muy justo. Definitivamente recomendado para cualquier servidor de Discord.',
          likes: 15
        },
        {
          user_id: users.length > 1 ? users[1].discord_id : users[0].discord_id,
          rating: 5,
          title: 'Mejor que un casino real',
          content: 'La experiencia que ofrece este bot es increíble. Me encanta la variedad de juegos y las recompensas diarias. El soporte también es excelente.',
          likes: 8
        },
        {
          user_id: users[0].discord_id, // Reusar el primer usuario para mostrar que funciona la restricción
          rating: 4,
          title: 'Muy buena experiencia',
          content: 'Bot muy completo con muchas funciones. Algunas veces puede ser un poco lento pero en general muy satisfecho con la experiencia.',
          likes: 12
        }
      ];

      for (const review of reviewsData) {
        try {
          await connection.execute(
            'INSERT INTO reviews (user_id, rating, title, content, likes) VALUES (?, ?, ?, ?, ?)',
            [review.user_id, review.rating, review.title, review.content, review.likes]
          );
          console.log(`✅ Review creada para usuario: ${review.user_id.substring(0, 8)}...`);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️  Usuario ${review.user_id.substring(0, 8)}... ya tiene una review`);
          } else {
            console.error(`❌ Error creando review: ${error.message}`);
          }
        }
      }
    }

    // Verificar resultados
    const [reviewCount] = await connection.execute('SELECT COUNT(*) as count FROM reviews');
    console.log(`🎉 Total reviews creadas: ${reviewCount[0].count}`);

    // Mostrar reviews con información de usuario
    console.log('\n📋 Reviews creadas con información de usuario:');
    const [reviews] = await connection.execute(`
      SELECT 
        r.id,
        r.rating,
        r.title,
        LEFT(r.content, 50) as content_preview,
        r.likes,
        COALESCE(u.custom_username, u.display_name, 'Usuario') as username,
        u.is_verified as verified
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      ORDER BY r.created_at DESC
    `);

    reviews.forEach((review, index) => {
      console.log(`${index + 1}. "${review.title}" por ${review.username} (${review.rating}⭐)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addReviewsWithRealUsers();