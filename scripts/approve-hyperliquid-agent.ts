/**
 * Approve Agent for Hyperliquid Trading
 * 
 * Allows an agent wallet to trade on behalf of a user
 * User must sign the approval with their private key
 */

import { ethers } from 'ethers';

async function approveAgent() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Approve Agent for Hyperliquid Trading              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Agent wallet address (derived from agent private key)
  const agentPrivateKey = process.env.HYPERLIQUID_TEST_AGENT_KEY;
  if (!agentPrivateKey) {
    console.error('❌ HYPERLIQUID_TEST_AGENT_KEY not found in .env');
    process.exit(1);
  }
  
  const agentWallet = new ethers.Wallet(agentPrivateKey);
  const agentAddress = agentWallet.address;
  
  console.log('📋 Agent Details:');
  console.log(`   Agent Address: ${agentAddress}`);
  console.log('');
  
  // User wallet address (the funded wallet)
  const userWalletAddress = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
  console.log('👤 User Wallet: ' + userWalletAddress);
  console.log('');
  
  console.log('⚠️  IMPORTANT: You need to approve this agent with your USER wallet');
  console.log('');
  console.log('Option 1: Using Hyperliquid UI (Recommended)');
  console.log('   1. Go to https://app.hyperliquid-testnet.xyz');
  console.log('   2. Connect your wallet: ' + userWalletAddress);
  console.log('   3. Go to Settings → Agent Wallets');
  console.log('   4. Add agent address: ' + agentAddress);
  console.log('   5. Approve the transaction');
  console.log('');
  
  console.log('Option 2: Using Python Service API');
  console.log('   Provide your user private key to approve programmatically');
  console.log('   (Only use this on testnet!)');
  console.log('');
  console.log('curl -X POST http://localhost:5001/approve-agent \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"userPrivateKey":"YOUR_PRIVATE_KEY","agentAddress":"' + agentAddress + '"}\'');
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Once approved, the agent can:');
  console.log('   ✅ Open perp positions using your funds');
  console.log('   ✅ Close positions');
  console.log('   ✅ Manage your Hyperliquid positions');
  console.log('   ❌ Cannot withdraw your funds');
  console.log('');
  console.log('🔐 Security:');
  console.log('   - You retain full control of your funds');
  console.log('   - You can revoke agent access anytime');
  console.log('   - Agent can only trade, not withdraw');
  console.log('');
}

approveAgent();

