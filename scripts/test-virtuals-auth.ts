/**
 * Test Virtuals API Authentication
 * Based on: https://whitepaper.virtuals.io/builders-hub/commonly-asked-questions/terminal-api
 */

async function testVirtualsAuth() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔐 TESTING VIRTUALS API AUTHENTICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try with the API key from .env (load it manually for this test)
  const fs = require('fs');
  const envContent = fs.readFileSync('.env', 'utf-8');
  const apiKeyMatch = envContent.match(/GAME_API_KEY=(.+)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

  if (!apiKey) {
    console.log('❌ GAME_API_KEY not found in .env');
    return;
  }

  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Key prefix: ${apiKey.substring(0, 3)}\n`);

  try {
    // Step 1: Get Access Token (similar to Terminal API pattern)
    console.log('📡 Step 1: Testing authentication with Virtuals API...');
    
    const authResponse = await fetch('https://api.virtuals.io/api/accesses/tokens', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Response status: ${authResponse.status} ${authResponse.statusText}`);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log(`   ❌ Authentication failed!`);
      console.log(`   Error: ${errorText}\n`);
      
      if (authResponse.status === 403) {
        console.log('🔍 Diagnosis:');
        console.log('   - API key might be invalid or expired');
        console.log('   - API key might be for a different service (Terminal API vs Twitter API)');
        console.log('   - You may need to generate a new API key from GAME Console\n');
      }
      return;
    }

    const authData = await authResponse.json();
    console.log('   ✅ Authentication successful!');
    console.log(`   Access Token: ${authData.data?.accessToken?.substring(0, 20)}...\n`);

    // Step 2: Test if this access token works with Twitter API
    console.log('📡 Step 2: Testing Twitter API with access token...');
    const twitterResponse = await fetch('http://localhost:8001/tweets/elonmusk?max_results=5');
    
    console.log(`   Response status: ${twitterResponse.status}`);
    
    if (twitterResponse.ok) {
      const tweets = await twitterResponse.json();
      console.log(`   ✅ Fetched ${tweets.length || 0} tweets!\n`);
    } else {
      const errorText = await twitterResponse.text();
      console.log(`   ❌ Failed: ${errorText}\n`);
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testVirtualsAuth();

