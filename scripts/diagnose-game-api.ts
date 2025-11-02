#!/usr/bin/env npx tsx
/**
 * Comprehensive GAME X API Diagnostics
 * Tests all possible endpoints and configurations
 */

import axios from 'axios';

const GAME_API_KEY = process.env.GAME_API_KEY || 'apx-31d308e580e9a3b0efc45eb02db1f977';
const TEST_USERNAME = 'elonmusk'; // High-volume account for testing

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   GAME X API Diagnostics                                      ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log(`API Key: ${GAME_API_KEY.substring(0, 10)}...`);
console.log(`Test User: @${TEST_USERNAME}\n`);

async function testEndpoint(name: string, url: string, config: any) {
  console.log(`━━━ ${name} ━━━`);
  console.log(`URL: ${url}`);
  console.log(`Headers:`, JSON.stringify(config.headers, null, 2));
  if (config.params) {
    console.log(`Params:`, JSON.stringify(config.params, null, 2));
  }
  
  try {
    const response = await axios.get(url, config);
    
    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    console.log(`Response Headers:`, JSON.stringify(response.headers, null, 2));
    
    if (response.data) {
      const dataStr = JSON.stringify(response.data, null, 2);
      console.log(`Response Body (first 500 chars):`);
      console.log(dataStr.substring(0, 500));
      
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log(`\n📊 Found ${response.data.data.length} tweets!`);
        if (response.data.data.length > 0) {
          console.log('First tweet:', JSON.stringify(response.data.data[0], null, 2));
        }
      }
    } else {
      console.log('⚠️  Empty response body');
    }
  } catch (error: any) {
    if (error.response) {
      console.log(`❌ Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`Error Response:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ENOTFOUND') {
      console.log(`❌ DNS Error: ${error.hostname} not found`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(64) + '\n');
}

async function runDiagnostics() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Current Implementation (api.virtuals.io)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'Current GAME SDK Endpoint',
    `https://api.virtuals.io/api/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'Authorization': `Bearer ${GAME_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Alternative Path Format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'Alternative: /twitter/tweets',
    `https://api.virtuals.io/api/twitter/tweets`,
    {
      headers: {
        'Authorization': `Bearer ${GAME_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        username: TEST_USERNAME,
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: v1 API Path');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'v1 API',
    `https://api.virtuals.io/v1/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'Authorization': `Bearer ${GAME_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: X-API-Key Header Format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'X-API-Key Header',
    `https://api.virtuals.io/api/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'X-API-Key': GAME_API_KEY,
        'Content-Type': 'application/json'
      },
      params: {
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 5: API Key as Query Parameter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'Query Param',
    `https://api.virtuals.io/api/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        api_key: GAME_API_KEY,
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 6: Different Base URL (game.virtuals.io)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'game.virtuals.io',
    `https://game.virtuals.io/api/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'Authorization': `Bearer ${GAME_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        max_results: 10
      }
    }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 7: GAME SDK Official Format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testEndpoint(
    'Official SDK Format',
    `https://api.virtuals.io/api/twitter/user/${TEST_USERNAME}/tweets`,
    {
      headers: {
        'Authorization': `Bearer ${GAME_API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'Maxxit-Trading-Agent/1.0'
      },
      params: {
        count: 10 // Try 'count' instead of 'max_results'
      }
    }
  );

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Diagnostics Complete                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('Next Steps:');
  console.log('  1. Check which endpoint returned tweets');
  console.log('  2. Update GameTwitterClient with working format');
  console.log('  3. Test with actual CT accounts\n');
}

runDiagnostics();

