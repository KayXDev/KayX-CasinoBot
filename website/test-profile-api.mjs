import fetch from 'node-fetch';

async function testProfileAPI() {
  const profiles = [
    '388422519553654786',
    'kayx',
    'kayxsc',
    'profile_1762045252270_j4m8t3137'
  ];

  console.log('🧪 Testing Profile API endpoints...\n');

  for (const profileId of profiles) {
    try {
      console.log(`📡 Testing profile: ${profileId}`);
      const response = await fetch(`http://localhost:3000/api/profiles/${profileId}`);
      const data = await response.json();
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${data.success}`);
      
      if (data.success) {
        console.log(`   ✅ Profile found: ${data.profile.displayName}`);
      } else {
        console.log(`   ❌ Error: ${data.error}`);
      }
      console.log('');
    } catch (error) {
      console.log(`   💥 Request failed: ${error.message}\n`);
    }
  }
}

testProfileAPI();