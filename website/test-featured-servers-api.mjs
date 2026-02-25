import fetch from 'node-fetch';

async function testFeaturedServersAPI() {
  try {
    console.log('🧪 Testing Featured Servers API...\n');
    
    // Test GET - Fetch featured servers
    console.log('📡 Testing GET /api/featured-servers...');
    const getResponse = await fetch('http://localhost:3000/api/featured-servers');
    const getData = await getResponse.json();
    
    console.log(`   Status: ${getResponse.status}`);
    console.log(`   Success: ${getData.success}`);
    console.log(`   Servers count: ${getData.servers?.length || 0}`);
    
    if (getData.servers && getData.servers.length > 0) {
      const firstServer = getData.servers[0];
      console.log(`   First server: "${firstServer.server_name}"`);
      console.log(`   Server ID: ${firstServer.id}`);
      console.log(`   Category: ${firstServer.category}`);
      console.log(`   Members: ${firstServer.members}`);
      console.log(`   Added by: ${firstServer.added_by}`);
      
      console.log('\n✅ Featured servers API is working');
      console.log(`📊 Total servers: ${getData.servers.length}`);
      
      // Show all server names
      console.log('\n📋 Server list:');
      getData.servers.forEach((server, index) => {
        console.log(`   ${index + 1}. "${server.server_name}" (ID: ${server.id})`);
      });
    } else {
      console.log('   No servers found');
    }
    
  } catch (error) {
    console.log('💥 Error testing API:', error.message);
  }
}

testFeaturedServersAPI();