/**
 * Test if apt- token works as Twitter Access Token
 */

async function testAptToken() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧪 TESTING apt- TOKEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const token = 'apt-201ee4d1d0dd1e5582e2ee0047527630';
  console.log(`Token: ${token}\n`);

  // Test 1: Try as Bearer token (standard OAuth)
  console.log('📡 Test 1: Using as Bearer token...');
  try {
    const response = await fetch('https://api.twitter.com/2/users/by/username/elonmusk', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Works as Bearer token!', data);
    } else {
      const error = await response.text();
      console.log(`   ❌ Failed: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Try direct GAME API endpoint for tweets
  console.log('\n📡 Test 2: Using GAME Twitter API directly...');
  try {
    const response = await fetch('https://twitter.game.virtuals.io/tweets/elonmusk?max_results=5', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success! Fetched ${data.length || 0} tweets`);
      if (data.length > 0) {
        console.log(`   First tweet: ${data[0].text?.substring(0, 100)}...`);
      }
    } else {
      const error = await response.text();
      console.log(`   ❌ Failed: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Try with X-API-KEY header
  console.log('\n📡 Test 3: Using as X-API-KEY header...');
  try {
    const response = await fetch('https://twitter.game.virtuals.io/tweets/elonmusk?max_results=5', {
      headers: {
        'X-API-KEY': token,
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success! Fetched ${data.length || 0} tweets`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Failed: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Check if token type is documented
  console.log('\n📋 Token Analysis:');
  console.log(`   Prefix: apt- (likely "Access Token")`);
  console.log(`   Expected: apx- for GAME API keys`);
  console.log(`   Source: GAME Console (console.game.virtuals.io)`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testAptToken();

