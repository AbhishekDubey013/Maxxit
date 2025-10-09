/**
 * Test GAME API Twitter Integration
 * Tests if we can fetch tweets using the GAME API
 */

import { GameApiClient } from '../lib/x-api-multi';

async function testGameApi() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧪 TESTING GAME API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // HARDCODED API KEY FOR TESTING
  const GAME_API_KEY = 'apx-090643c41e39f3a6e11fefedf2a37e6e8af34e5d';
  const GAME_API_URL = 'http://localhost:8001'; // Local Python proxy

  console.log(`API Key: ${GAME_API_KEY.substring(0, 10)}...`);
  console.log(`API URL: ${GAME_API_URL}\n`);

  try {
    // Test with Python proxy
    console.log('📡 Testing via LOCAL PYTHON PROXY...');
    const directClient = new GameApiClient(GAME_API_KEY, GAME_API_URL);
    
    // Try a popular account first (less likely to have caching/rate limit issues)
    const testAccounts = ['elonmusk', 'Abhishe42402615'];
    
    for (const account of testAccounts) {
      console.log(`\n📍 Trying @${account}...`);
      const tweets = await directClient.getUserTweets(account, {
        maxResults: 5,
      });
      
      if (tweets && tweets.length > 0) {
        console.log(`✅ SUCCESS! Fetched ${tweets.length} tweets from @${account}:\n`);
        tweets.forEach((tweet, i) => {
          console.log(`${i + 1}. [${tweet.id}]`);
          console.log(`   ${tweet.text.substring(0, 150)}...`);
          console.log(`   Created: ${tweet.created_at}\n`);
        });
        break;
      } else {
        console.log(`⚠️  No tweets from @${account}`);
      }
    }
    
    return;


  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testGameApi();

