/**
 * Check GMX Router contract ABI from Arbiscan
 */

import fetch from 'node-fetch';

// GMX ExchangeRouter - the main trading contract
const GMX_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || 'YourApiKeyToken';

async function main() {
  try {
    console.log('🔍 Fetching ABI for GMX Router...\n');
    console.log('Contract:', GMX_ROUTER);
    console.log('');

    const url = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${GMX_ROUTER}&apikey=${ARBISCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.status === '1' && data.result) {
      const abi = JSON.parse(data.result);
      
      console.log('✅ Contract ABI found!');
      console.log('');
      console.log('Available functions:');
      
      const functions = abi
        .filter((item: any) => item.type === 'function')
        .map((item: any) => item.name);
      
      functions.forEach((name: string, i: number) => {
        console.log(`  ${i + 1}. ${name}()`);
      });
      
      // Check for subaccount-related functions
      const subaccountFuncs = functions.filter((name: string) => 
        name.toLowerCase().includes('subaccount')
      );
      
      console.log('');
      if (subaccountFuncs.length > 0) {
        console.log('✅ Subaccount-related functions found:');
        subaccountFuncs.forEach((name: string) => {
          console.log(`   - ${name}()`);
        });
      } else {
        console.log('❌ NO subaccount-related functions found!');
        console.log('   This contract does NOT support setSubaccount()');
      }
    } else {
      console.log('❌ Failed to fetch ABI:', data.message || data.result);
      console.log('   The contract might not be verified on Arbiscan');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();

