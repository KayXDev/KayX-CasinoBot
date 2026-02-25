// Script simple para probar la API de reviews localmente
import fetch from 'node-fetch';

async function testReviewsAPI() {
  try {
    console.log('🧪 Probando API de reviews...');
    
    const response = await fetch('http://localhost:3000/api/reviews');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API funcionando correctamente');
      console.log('📊 Reviews encontradas:', data.reviews?.length || 0);
      
      if (data.reviews && data.reviews.length > 0) {
        console.log('\n📋 Primeras 3 reviews:');
        data.reviews.slice(0, 3).forEach((review, index) => {
          console.log(`${index + 1}. "${review.title}" por ${review.username} (${review.rating}⭐)`);
          console.log(`   Verificado: ${!!review.verified ? 'Sí' : 'No'}`);
        });
      }
    } else {
      console.log('❌ Error en API:', response.status);
    }
    
  } catch (error) {
    console.log('⚠️ Servidor no está corriendo o hay un error de red');
    console.log('Inicia el servidor con: npm run dev');
  }
}

testReviewsAPI();