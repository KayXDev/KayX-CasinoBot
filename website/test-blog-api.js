// Test para probar la creación de blog posts via API
const fetch = require('node-fetch');

async function testBlogAPI() {
  try {
    console.log('🧪 Probando API de blogs...');
    
    // Datos del post de prueba
    const postData = {
      title: 'Test de notificaciones via API',
      content: 'Este es un post de prueba para verificar que las notificaciones se envían correctamente cuando se crea un blog post via API.',
      excerpt: 'Post de prueba para notificaciones via API',
      category: 'General',
      tags: ['test', 'notifications']
    };

    console.log('📤 Enviando request a la API...');
    
    const response = await fetch('http://localhost:3000/api/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aquí deberíamos incluir cookies de autenticación, pero para testing usamos mock
      },
      body: JSON.stringify(postData)
    });

    const result = await response.json();
    
    console.log('📥 Respuesta de la API:');
    console.log(result);
    
    if (result.success) {
      console.log('✅ Post creado exitosamente');
      console.log(`📝 ID del post: ${result.postId}`);
      
      // Esperar un poco y verificar si se crearon notificaciones
      console.log('⏳ Esperando 2 segundos para verificar notificaciones...');
      setTimeout(async () => {
        // Aquí podrías verificar la base de datos directamente
        console.log('🔍 Verifica manualmente en la base de datos si se crearon las notificaciones');
      }, 2000);
    } else {
      console.log('❌ Error al crear el post:', result.error);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Asegúrate de que el servidor Next.js esté corriendo en http://localhost:3000');
    }
  }
}

testBlogAPI();