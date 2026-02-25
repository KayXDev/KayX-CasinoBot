import fetch from 'node-fetch';

async function testChangelogStructure() {
  try {
    console.log('🧪 Probando estructura de changelogs...\n');
    
    const response = await fetch('http://localhost:3000/api/changelogs');
    const data = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`📊 Changelogs length: ${data.changelogs?.length || 0}\n`);
    
    if (data.success && data.changelogs && data.changelogs.length > 0) {
      console.log('📋 Primer changelog:');
      const firstChangelog = data.changelogs[0];
      
      console.log(`   ID: ${firstChangelog.id}`);
      console.log(`   Title: ${firstChangelog.title}`);
      console.log(`   Version: ${firstChangelog.version}`);
      console.log(`   Date: ${firstChangelog.date}`);
      console.log(`   Featured: ${firstChangelog.featured}`);
      console.log(`   Changes type: ${typeof firstChangelog.changes}`);
      
      if (firstChangelog.changes) {
        console.log('   Changes structure:');
        if (Array.isArray(firstChangelog.changes)) {
          console.log(`     - Array with ${firstChangelog.changes.length} items`);
          firstChangelog.changes.forEach((change, index) => {
            console.log(`     - [${index}] Type: ${change.type}, Items: ${change.items?.length || 0}`);
          });
        } else if (typeof firstChangelog.changes === 'object') {
          console.log(`     - Object with keys: ${Object.keys(firstChangelog.changes).join(', ')}`);
          Object.entries(firstChangelog.changes).forEach(([key, value]) => {
            console.log(`     - ${key}: ${Array.isArray(value) ? value.length + ' items' : typeof value}`);
          });
        } else {
          console.log(`     - Type: ${typeof firstChangelog.changes}`);
        }
      } else {
        console.log('   Changes: null/undefined');
      }
      
      console.log('\n📄 Full changelog JSON:');
      console.log(JSON.stringify(firstChangelog, null, 2));
      
    } else {
      console.log('❌ No changelogs found or API error');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

testChangelogStructure();