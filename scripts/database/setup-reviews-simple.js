import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno desde website/.env.local
dotenv.config({ path: './website/.env.local' });

async function createReviewsTables() {
  console.log('🔄 Conectando a la base de datos...');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Sin contraseña según tu .env.local
    database: 'casino_bot',
    charset: 'utf8mb4'
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Crear tabla reviews
    console.log('📝 Creando tabla reviews...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id VARCHAR(50) NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          title VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          likes INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_user_id (user_id),
          INDEX idx_rating (rating),
          INDEX idx_created_at (created_at),
          
          UNIQUE KEY unique_user_review (user_id)
      )
    `);
    
    // Crear tabla review_likes
    console.log('👍 Creando tabla review_likes...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_likes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          review_id INT NOT NULL,
          user_id VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_review_id (review_id),
          INDEX idx_user_id (user_id),
          
          FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_like (review_id, user_id)
      )
    `);
    
    // Insertar datos de ejemplo
    console.log('📊 Insertando reviews de ejemplo...');
    await connection.execute(`
      INSERT IGNORE INTO reviews (user_id, rating, title, content, likes) VALUES
      ('388422519553654786', 5, '¡Increíble bot de casino!', 'He estado usando este bot por meses y es simplemente fantástico. Los juegos son emocionantes y el sistema es muy justo. Definitivamente recomendado para cualquier servidor de Discord.', 15),
      ('123456789012345678', 5, 'Mejor que un casino real', 'La experiencia que ofrece este bot es increíble. Me encanta la variedad de juegos y las recompensas diarias. El soporte también es excelente.', 8),
      ('234567890123456789', 4, 'Muy buena experiencia', 'Bot muy completo con muchas funciones. Algunas veces puede ser un poco lento pero en general muy satisfecho con la experiencia.', 12),
      ('345678901234567890', 5, 'Adictivo y divertivo', 'No puedo parar de jugar! Los mini-juegos son super entretenidos y el sistema de monedas está muy bien balanceado. 10/10', 20),
      ('456789012345678901', 4, 'Gran variedad de juegos', 'Me gusta mucho la cantidad de juegos disponibles. El blackjack y la ruleta son mis favoritos. Solo le falta mejorar un poco la interfaz.', 6)
    `);
    
    // Verificar
    const [reviewCount] = await connection.execute('SELECT COUNT(*) as count FROM reviews');
    const [likeCount] = await connection.execute('SELECT COUNT(*) as count FROM review_likes');
    
    console.log('🎉 ¡Tablas creadas exitosamente!');
    console.log(`📝 Total reviews: ${reviewCount[0].count}`);
    console.log(`👍 Total likes: ${likeCount[0].count}`);
    
    console.log('✨ Sistema de reviews listo para usar!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createReviewsTables();