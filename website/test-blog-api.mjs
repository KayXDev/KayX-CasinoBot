import fetch from 'node-fetch';

async function testBlogAPI() {
  try {
    console.log('🧪 Testing Blog API...\n');
    
    // Test GET - Fetch blog posts
    console.log('📡 Testing GET /api/blogs...');
    const getResponse = await fetch('http://localhost:3000/api/blogs');
    const getData = await getResponse.json();
    
    console.log(`   Status: ${getResponse.status}`);
    console.log(`   Success: ${getData.success}`);
    console.log(`   Posts count: ${getData.posts?.length || 0}`);
    
    if (getData.posts && getData.posts.length > 0) {
      const firstPost = getData.posts[0];
      console.log(`   First post: "${firstPost.title}" by ${firstPost.author}`);
      console.log(`   Post ID: ${firstPost.id}`);
      
      // Test a simple update (this would require authentication in real usage)
      console.log('\n📝 Blog posts found and accessible');
    } else {
      console.log('   No posts found');
    }
    
  } catch (error) {
    console.log('💥 Error testing API:', error.message);
  }
}

testBlogAPI();