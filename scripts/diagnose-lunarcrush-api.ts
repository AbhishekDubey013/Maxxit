/**
 * Diagnostic script to test LunarCrush API access
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.LUNARCRUSH_API_KEY;

async function testLunarCrushAPI() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LunarCrush API Diagnostic                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!API_KEY) {
    console.log('❌ LUNARCRUSH_API_KEY not found in .env');
    return;
  }

  console.log(`✅ API Key found: ${API_KEY.substring(0, 10)}...`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test different API endpoints
  const endpoints = [
    {
      name: 'API v2 (assets)',
      url: 'https://api.lunarcrush.com/v2',
      params: { data: 'assets', symbol: 'BTC', key: API_KEY }
    },
    {
      name: 'API v3 (coins)',
      url: 'https://lunarcrush.com/api3/coins',
      params: { symbol: 'BTC', key: API_KEY }
    },
    {
      name: 'API v3 (coins/BTC)',
      url: 'https://lunarcrush.com/api3/coins/BTC',
      params: { key: API_KEY }
    },
    {
      name: 'API v4 (if exists)',
      url: 'https://lunarcrush.com/api4/coins',
      params: { symbol: 'BTC', key: API_KEY }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    console.log(`Params:`, endpoint.params);
    
    try {
      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.data) {
        if (typeof response.data === 'object') {
          console.log(`Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
        } else {
          console.log(`Response:`, String(response.data).substring(0, 500));
        }
      }

      if (response.status === 200 && response.data?.data) {
        console.log('\n✅ SUCCESS! This endpoint works!\n');
        
        // Show available fields
        const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        console.log('Available fields:', Object.keys(data).join(', '));
        break;
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(63) + '\n');
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Diagnostic complete.');
  console.log('\nIf all endpoints failed:');
  console.log('1. Check if API key is valid');
  console.log('2. Check LunarCrush API documentation');
  console.log('3. LunarCrush may have restricted their public API');
}

testLunarCrushAPI().catch(console.error);

