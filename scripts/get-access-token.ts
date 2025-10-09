/**
 * Get Access Token from GAME API Key
 * Based on: https://whitepaper.virtuals.io/builders-hub/commonly-asked-questions/terminal-api
 */

async function getAccessToken() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔐 EXCHANGING API KEY FOR ACCESS TOKEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const apiKey = 'apt-201ee4d1d0dd1e5582e2ee0047527630';
  console.log(`API Key: ${apiKey}\n`);

  try {
    // Step 1: Get Access Token
    console.log('📡 Calling: POST https://api.virtuals.io/api/accesses/tokens');
    console.log('   Header: X-API-KEY: ' + apiKey.substring(0, 15) + '...\n');
    
    const response = await fetch('https://api.virtuals.io/api/accesses/tokens', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Failed to get access token');
      console.log('Error:', errorText);
      return;
    }

    const data = await response.json();
    const accessToken = data.data?.accessToken;

    if (!accessToken) {
      console.log('❌ No access token in response');
      console.log('Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ SUCCESS! Got access token:');
    console.log(`   ${accessToken}\n`);
    console.log(`   Prefix: ${accessToken.substring(0, 4)}`);
    console.log(`   Length: ${accessToken.length} characters\n`);

    // Step 2: Test if this works with Twitter API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🧪 TESTING ACCESS TOKEN WITH TWITTER API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test with Python proxy
    console.log('📡 Testing with local Python proxy...');
    const proxyTest = await fetch('http://localhost:8001/tweets/elonmusk?max_results=5');
    console.log(`   Status: ${proxyTest.status}`);
    
    if (proxyTest.ok) {
      const tweets = await proxyTest.json();
      console.log(`   ✅ Fetched ${tweets.length || 0} tweets!\n`);
      if (tweets.length > 0) {
        console.log(`   Latest tweet: "${tweets[0].text?.substring(0, 100)}..."\n`);
      }
    } else {
      const error = await proxyTest.text();
      console.log(`   ❌ Failed: ${error}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  💾 ADD THIS TO YOUR .env FILE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`GAME_API_KEY=${accessToken}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
  }
}

getAccessToken();

