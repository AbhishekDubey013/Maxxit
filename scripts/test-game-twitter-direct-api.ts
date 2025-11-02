#!/usr/bin/env tsx

/**
 * Test GAME Twitter API with apx- key directly
 */

import axios from 'axios';

async function testGameTwitterDirectAPI() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Testing GAME Twitter Direct API with apx- Key              ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const apxKey = 'apx-31d308e580e9a3b0efc45eb02db1f977';
  const baseUrl = 'https://api.virtuals.io';
  
  const testCases = [
    {
      name: 'Test 1: /api/twitter/user/{username}/tweets',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/api/twitter/user/elonmusk/tweets`,
        headers: {
          'X-API-Key': apxKey,
          'Content-Type': 'application/json'
        },
        params: {
          count: 5
        }
      }
    },
    {
      name: 'Test 2: /api/twitter/search',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/api/twitter/search`,
        headers: {
          'X-API-Key': apxKey,
          'Content-Type': 'application/json'
        },
        params: {
          query: 'crypto',
          count: 5
        }
      }
    },
    {
      name: 'Test 3: Authorization Bearer format',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/api/twitter/user/elonmusk/tweets`,
        headers: {
          'Authorization': `Bearer ${apxKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          count: 5
        }
      }
    },
    {
      name: 'Test 4: /v1/twitter/tweets',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/v1/twitter/tweets`,
        headers: {
          'X-API-Key': apxKey,
          'Content-Type': 'application/json'
        },
        params: {
          username: 'elonmusk',
          count: 5
        }
      }
    },
    {
      name: 'Test 5: /api/game/twitter (GAME SDK endpoint)',
      config: {
        method: 'POST' as const,
        url: `${baseUrl}/api/game/twitter`,
        headers: {
          'X-API-Key': apxKey,
          'Content-Type': 'application/json'
        },
        data: {
          action: 'search',
          query: 'crypto',
          max_results: 5
        }
      }
    },
    {
      name: 'Test 6: Direct Twitter API v2 format',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/api/v2/tweets/search/recent`,
        headers: {
          'Authorization': `Bearer ${apxKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          query: 'crypto',
          max_results: 5
        }
      }
    },
    {
      name: 'Test 7: Check if API key is valid at all',
      config: {
        method: 'GET' as const,
        url: `${baseUrl}/api/status`,
        headers: {
          'X-API-Key': apxKey
        }
      }
    }
  ];

  for (const test of testCases) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ${test.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`   URL: ${test.config.url}`);
    console.log(`   Headers: ${JSON.stringify(test.config.headers, null, 2).replace(/\n/g, '\n   ')}`);
    if (test.config.params) {
      console.log(`   Params: ${JSON.stringify(test.config.params)}`);
    }
    if (test.config.data) {
      console.log(`   Body: ${JSON.stringify(test.config.data)}`);
    }
    
    try {
      const response = await axios(test.config);
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      console.log(`   📦 Data:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      
      if (response.data && typeof response.data === 'object') {
        const dataKeys = Object.keys(response.data);
        console.log(`   🔑 Keys: ${dataKeys.join(', ')}`);
      }
    } catch (error: any) {
      if (error.response) {
        console.log(`   ❌ Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`   📦 Data:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  Tested 7 different endpoint configurations');
  console.log('  with apx- key (V1 GAME API key)\n');
}

testGameTwitterDirectAPI();

