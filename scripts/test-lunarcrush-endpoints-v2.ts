/**
 * Test additional LunarCrush endpoint patterns
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.LUNARCRUSH_API_KEY;

async function testAdditionalEndpoints() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LunarCrush API - Additional Endpoint Tests                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!API_KEY) {
    console.log('❌ LUNARCRUSH_API_KEY not found');
    return;
  }

  console.log(`API Key: ${API_KEY.substring(0, 10)}...\n`);

  // Test various endpoint patterns
  const endpoints = [
    {
      name: 'Public API v2',
      url: 'https://lunarcrush.com/api/public/coins/BTC',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    },
    {
      name: 'API v2 with Bearer',
      url: 'https://api.lunarcrush.com/v2',
      method: 'GET',
      params: { data: 'assets', symbol: 'BTC' },
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    },
    {
      name: 'Coins endpoint',
      url: 'https://lunarcrush.com/coins/BTC',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    },
    {
      name: 'API endpoint with key param',
      url: 'https://lunarcrush.com/api/coins/BTC',
      method: 'GET',
      params: { key: API_KEY }
    },
    {
      name: 'Legacy v2 with key',
      url: 'https://api.lunarcrush.com/v2',
      method: 'GET',
      params: { data: 'assets', key: API_KEY, symbol: 'BTC' }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    if (endpoint.params) console.log(`Params:`, endpoint.params);
    if (endpoint.headers) console.log(`Headers:`, Object.keys(endpoint.headers).join(', '));
    
    try {
      const config: any = {
        method: endpoint.method,
        url: endpoint.url,
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx
      };
      
      if (endpoint.params) config.params = endpoint.params;
      if (endpoint.headers) config.headers = endpoint.headers;

      const response = await axios(config);

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.data) {
        const dataStr = typeof response.data === 'object' 
          ? JSON.stringify(response.data, null, 2)
          : String(response.data);
        
        if (dataStr.includes('<!DOCTYPE') || dataStr.includes('<html')) {
          console.log(`Response: HTML page (not JSON)`);
        } else {
          console.log(`Response:`, dataStr.substring(0, 500));
        }
      }

      if (response.status === 200 && response.data && typeof response.data === 'object') {
        console.log('\n✅ SUCCESS! This endpoint works!\n');
        break;
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(63));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testAdditionalEndpoints().catch(console.error);
