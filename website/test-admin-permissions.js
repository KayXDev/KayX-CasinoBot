// Test script para verificar el sistema de permisos de administrador
// Ejecutar desde la consola del navegador mientras estés autenticado

async function testAdminPermissions() {
  try {
    console.log('🔍 Probando sistema de permisos de administrador...');
    
    const response = await fetch('/api/users/permissions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalles del error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Respuesta de la API:', data);

    if (data.success) {
      console.log('📊 Resultados de permisos:');
      console.log(`   - Es Admin: ${data.isAdmin ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   - Es Owner: ${data.isOwner ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   - Permisos: [${data.permissions?.join(', ') || 'Ninguno'}]`);
      console.log(`   - Roles: ${data.roles || 0}`);
    } else {
      console.log('❌ Error:', data.error);
    }

  } catch (error) {
    console.error('💥 Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testAdminPermissions();