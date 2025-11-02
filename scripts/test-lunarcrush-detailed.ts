/**
 * Detailed LunarCrush API test with full response capture
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.LUNARCRUSH_API_KEY;

async function detailedTest() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LunarCrush API - Detailed Response Test                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!API_KEY) {
    console.log('❌ No API key');
    return;
  }

  console.log(`Testing with key: ${API_KEY.substring(0, 15)}...\n`);

  // Test the most likely endpoint with detailed logging
  const testUrl = 'https://lunarcrush.com/api3/coins';
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Query Parameter with symbol');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const response = await axios({
      method: 'GET',
      url: testUrl,
      params: {
        symbol: 'BTC',
        key: API_KEY
      },
      timeout: 15000,
      validateStatus: () => true,
      maxRedirects: 0
    });

    console.log(`URL: ${testUrl}?symbol=BTC&key=${API_KEY.substring(0,10)}...`);
    console.log(`\nStatus Code: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`\nResponse Headers:`);
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log(`\nResponse Body Type: ${typeof response.data}`);
    
    if (response.data) {
      const dataStr = typeof response.data === 'object' 
        ? JSON.stringify(response.data, null, 2)
        : String(response.data);
      
      console.log(`\nResponse Body (first 1000 chars):`);
      console.log(dataStr.substring(0, 1000));
      
      if (response.data.error) {
        console.log(`\n❌ ERROR MESSAGE: ${response.data.error}`);
      }
      
      if (response.data.message) {
        console.log(`\n💬 MESSAGE: ${response.data.message}`);
      }
    }
  } catch (error: any) {
    console.log(`\n❌ Request Failed:`);
    console.log(`  Error: ${error.message}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, error.response.data);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Authorization Header');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await axios({
      method: 'GET',
      url: `${testUrl}/BTC`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 15000,
      validateStatus: () => true
    });

    console.log(`URL: ${testUrl}/BTC`);
    console.log(`Headers: Authorization: Bearer ${API_KEY.substring(0,10)}...`);
    console.log(`\nStatus Code: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.data) {
      const dataStr = typeof response.data === 'object' 
        ? JSON.stringify(response.data, null, 2)
        : String(response.data);
      
      console.log(`\nResponse Body (first 1000 chars):`);
      console.log(dataStr.substring(0, 1000));
    }
  } catch (error: any) {
    console.log(`\n❌ Request Failed: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: x-api-key Header');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await axios({
      method: 'GET',
      url: `${testUrl}/BTC`,
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      },
      timeout: 15000,
      validateStatus: () => true
    });

    console.log(`URL: ${testUrl}/BTC`);
    console.log(`Headers: x-api-key: ${API_KEY.substring(0,10)}...`);
    console.log(`\nStatus Code: ${response.status}`);
    
    if (response.data) {
      const dataStr = typeof response.data === 'object' 
        ? JSON.stringify(response.data, null, 2)
        : String(response.data);
      
      console.log(`\nResponse Body (first 1000 chars):`);
      console.log(dataStr.substring(0, 1000));
    }
  } catch (error: any) {
    console.log(`\n❌ Request Failed: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Test complete. Check your LunarCrush dashboard now!');
  console.log('   Should show 3 more API calls.');
  console.log('\n   Please tell me what the dashboard shows for these calls!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

detailedTest().catch(console.error);
