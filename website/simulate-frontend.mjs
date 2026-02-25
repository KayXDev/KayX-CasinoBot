import fetch from 'node-fetch';

async function simulateFrontendBehavior() {
  console.log('🎭 Simulando comportamiento del frontend...\n');
  
  try {
    console.log('🔍 Fetching changelogs from frontend...');
    const response = await fetch('http://localhost:3000/api/changelogs');
    console.log(`📡 Response status: ${response.status}, ok: ${response.ok}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Received data:', {
        success: data.success,
        changelogsLength: data.changelogs?.length || 0,
        hasChangelogs: !!data.changelogs
      });
      
      const changelogList = data.changelogs || [];
      console.log(`✅ Setting ${changelogList.length} changelogs`);
      
      if (changelogList.length > 0) {
        console.log('🎉 WOULD SHOW CHANGELOGS');
        
        // Debuggeando la estructura de changes
        console.log('\n🔍 Debugging changes structure:');
        changelogList.forEach((changelog, index) => {
          console.log(`Changelog ${index}:`);
          console.log(`  Title: ${changelog.title}`);
          console.log(`  Changes type: ${typeof changelog.changes}`);
          console.log(`  Changes isArray: ${Array.isArray(changelog.changes)}`);
          console.log(`  Changes value:`, changelog.changes);
        });
        
        // Simulando el cálculo de estadísticas
        const calculatedStats = changelogList.reduce((acc, changelog) => {
          acc.versions += 1;
          
          // Verificar si changes es un array o necesita conversión
          let changes = changelog.changes;
          if (!Array.isArray(changes)) {
            console.log(`⚠️ Changes for ${changelog.title} is not an array:`, typeof changes);
            return acc;
          }
          
          changes.forEach((changeGroup) => {
            if (changeGroup.type === 'new') {
              acc.features += changeGroup.items?.length || 0;
            } else if (changeGroup.type === 'fixed') {
              acc.fixes += changeGroup.items?.length || 0;
            } else if (changeGroup.type === 'improved') {
              acc.improvements += changeGroup.items?.length || 0;
            }
          });
          return acc;
        }, { versions: 0, features: 0, fixes: 0, improvements: 0 });
        
        console.log('📈 Calculated stats:', calculatedStats);
      } else {
        console.log('❌ WOULD SHOW "NO CHANGELOGS"');
      }
      
    } else {
      console.error('❌ Response not ok:', response.status);
      console.log('❌ WOULD SHOW "NO CHANGELOGS" (Response not ok)');
    }
    
  } catch (error) {
    console.error('💥 Error fetching changelogs:', error);
    console.log('❌ WOULD SHOW "NO CHANGELOGS" (Error)');
  }
}

simulateFrontendBehavior();