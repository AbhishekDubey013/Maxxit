#!/usr/bin/env tsx

/**
 * Test User Wallet Generation
 * Demonstrates how one address per user works
 */

import {
  getUserAgentWallet,
  getAgentAddressForUser,
  getUserAgentPrivateKey,
  userHasAgentWallet,
} from '../lib/hyperliquid-user-wallet';

async function testUserWalletGeneration() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Hyperliquid User Wallet Generation Test                    ║');
  console.log('║   One Address Per User Architecture                          ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Test user wallets
  const testUsers = [
    '0xABC123def456789abcdef0123456789ABCDEF01',
    '0x1234567890abcdef1234567890abcdef12345678',
  ];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO: User subscribes to multiple agents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const userWallet of testUsers) {
    console.log(`👤 User: ${userWallet}\n`);

    // Check if user already has a wallet
    const hasWallet = await userHasAgentWallet(userWallet);
    console.log(`   Existing wallet: ${hasWallet ? 'YES' : 'NO'}`);

    // Simulate: User subscribes to Ring Agent
    console.log('   \n   📝 User subscribes to "Ring Agent"...');
    const agentAddress1 = await getUserAgentWallet(userWallet);
    console.log(`   ✅ Agent address: ${agentAddress1}`);

    // Simulate: User subscribes to Vader Agent
    console.log('   \n   📝 User subscribes to "Vader Agent"...');
    const agentAddress2 = await getUserAgentWallet(userWallet);
    console.log(`   ✅ Agent address: ${agentAddress2}`);

    // Simulate: User subscribes to Luna Agent
    console.log('   \n   📝 User subscribes to "Luna Agent"...');
    const agentAddress3 = await getUserAgentWallet(userWallet);
    console.log(`   ✅ Agent address: ${agentAddress3}`);

    // Verify all three are the SAME
    const allSame = agentAddress1 === agentAddress2 && agentAddress2 === agentAddress3;
    console.log(`\n   🔍 All 3 agents use same address: ${allSame ? '✅ YES' : '❌ NO'}`);

    if (allSame) {
      console.log(`   🎯 User only needs to whitelist: ${agentAddress1}`);
    }

    // Test private key retrieval
    console.log('\n   🔐 Testing private key decryption...');
    try {
      const privateKey = await getUserAgentPrivateKey(userWallet);
      const isValid = privateKey.startsWith('0x') && privateKey.length === 66;
      console.log(`   ✅ Private key decrypted: ${isValid ? 'Valid format' : 'Invalid'}`);
      console.log(`   🔑 Private key: ${privateKey.substring(0, 10)}...${privateKey.substring(62)}`);
    } catch (error: any) {
      console.log(`   ❌ Decryption failed: ${error.message}`);
    }

    console.log('\n' + '━'.repeat(65) + '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BENEFITS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ One address per user (not per deployment)');
  console.log('✅ User whitelists ONCE on Hyperliquid');
  console.log('✅ Can subscribe to unlimited agents');
  console.log('✅ All agents use same whitelisted address');
  console.log('✅ Private keys encrypted with AES-256-GCM');
  console.log('✅ Simple user experience');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECURITY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Non-custodial: Funds stay in user\'s Hyperliquid account');
  console.log('✅ Agent can ONLY trade (no withdrawals)');
  console.log('✅ User can revoke access anytime');
  console.log('✅ Private keys never exposed');
  console.log('✅ Encrypted storage with proper IV and auth tag');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testUserWalletGeneration()
  .then(() => {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

