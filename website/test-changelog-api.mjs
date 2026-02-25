import fetch from 'node-fetch';

async function testChangelogAPI() {
  try {
    console.log('🧪 Probando la API de changelogs...\n');
    
    const response = await fetch('http://localhost:3000/api/changelogs');
    const data = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    
    if (data.success && data.changelogs) {
      console.log(`📊 Changelogs recibidos: ${data.changelogs.length}`);
      
      data.changelogs.forEach((changelog, index) => {
        console.log(`\n${index + 1}. ${changelog.title}`);
        console.log(`   Versión: ${changelog.version}`);
        console.log(`   Fecha: ${changelog.date}`);
        console.log(`   Featured: ${changelog.featured}`);
        
        if (changelog.changes) {
          if (changelog.changes.new) console.log(`   • Nuevas: ${changelog.changes.new.length}`);
          if (changelog.changes.improved) console.log(`   • Mejoras: ${changelog.changes.improved.length}`);
          if (changelog.changes.fixed) console.log(`   • Correcciones: ${changelog.changes.fixed.length}`);
        }
      });
    } else {
      console.log('❌ Error:', data.error || 'No se recibieron changelogs');
    }
    
  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
    console.log('🔧 ¿Está el servidor corriendo en localhost:3000?');
  }
}

testChangelogAPI();