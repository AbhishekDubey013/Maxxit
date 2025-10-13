/**
 * Test the deployment API directly
 */

import fetch from 'node-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://maxxit.vercel.app';
const USER_WALLET = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20'; // Your wallet

async function main() {
  console.log('🔍 Testing deployment API...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`User Wallet: ${USER_WALLET}\n`);
  
  try {
    const url = `${API_URL}/api/deployments?userWallet=${USER_WALLET}`;
    console.log(`Fetching: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) {
      console.log(`\n📊 Found ${data.length} deployment(s)`);
      
      if (data.length > 0) {
        console.log('\n⚠️  STALE DATA FOUND! These should have been deleted:\n');
        data.forEach((d: any, i: number) => {
          console.log(`${i + 1}. ${d.agent?.name || 'Unknown'}`);
          console.log(`   Module Enabled: ${d.moduleEnabled ? '✅ YES' : '❌ NO'}`);
          console.log(`   Module Address: ${d.moduleAddress || 'NULL'}`);
          console.log(`   Deployment ID: ${d.id}\n`);
        });
      } else {
        console.log('\n✅ No deployments (correct!)');
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main();

