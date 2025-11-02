/**
 * Test Hyperliquid Integration
 * 
 * Tests the complete flow without executing actual trades
 * 
 * Usage:
 * npx tsx scripts/test-hyperliquid-integration.ts
 */

import { ethers } from 'ethers';

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';

async function testServiceHealth() {
  console.log('🔍 Testing Hyperliquid service health...');
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Service is healthy:', data);
      return true;
    } else {
      console.log('❌ Service returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Service is not running or not accessible');
    console.log('   Make sure to start it: python services/hyperliquid-service.py');
    return false;
  }
}

async function testMarketInfo() {
  console.log('\n🔍 Testing market info...');
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: 'BTC' }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Market info retrieved:');
      console.log(`   BTC Price: $${data.price.toLocaleString()}`);
      console.log(`   Max Leverage: ${data.maxLeverage}x`);
      console.log(`   Size Decimals: ${data.szDecimals}`);
      return true;
    } else {
      console.log('❌ Market info failed:', data.error);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Market info test failed:', error.message);
    return false;
  }
}

async function testBalance() {
  console.log('\n🔍 Testing balance query...');
  try {
    // Use a known Hyperliquid address or create a test wallet
    const testWallet = ethers.Wallet.createRandom();
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet.address }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Balance query successful:');
      console.log(`   Withdrawable: $${data.withdrawable}`);
      console.log(`   Total: $${data.accountValue}`);
      return true;
    } else {
      console.log('❌ Balance query failed:', data.error);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Balance test failed:', error.message);
    return false;
  }
}

async function testPositions() {
  console.log('\n🔍 Testing positions query...');
  try {
    const testWallet = ethers.Wallet.createRandom();
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet.address }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Positions query successful:');
      console.log(`   Open positions: ${data.positions.length}`);
      return true;
    } else {
      console.log('❌ Positions query failed:', data.error);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Positions test failed:', error.message);
    return false;
  }
}

async function testDatabaseTokens() {
  console.log('\n🔍 Testing database tokens...');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const tokens = await prisma.venues_status.findMany({
      where: { venue: 'HYPERLIQUID' },
      take: 5,
    });
    
    await prisma.$disconnect();
    
    if (tokens.length > 0) {
      console.log('✅ Database tokens found:');
      tokens.forEach(token => {
        console.log(`   ${token.token_symbol}: min=${token.min_size?.toString()}, tick=${token.tick_size?.toString()}`);
      });
      return true;
    } else {
      console.log('❌ No Hyperliquid tokens in database');
      console.log('   Run: npx tsx scripts/add-hyperliquid-tokens.ts');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

async function testEncryptionKey() {
  console.log('\n🔍 Testing encryption key...');
  const encryptionKey = process.env.AGENT_WALLET_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    console.log('❌ AGENT_WALLET_ENCRYPTION_KEY not set in environment');
    console.log('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    return false;
  }
  
  if (encryptionKey.length !== 64) {
    console.log('❌ Encryption key should be 64 hex characters (32 bytes)');
    return false;
  }
  
  console.log('✅ Encryption key is configured correctly');
  return true;
}

async function main() {
  console.log('🧪 Hyperliquid Integration Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = {
    service: await testServiceHealth(),
    market: false,
    balance: false,
    positions: false,
    database: await testDatabaseTokens(),
    encryption: await testEncryptionKey(),
  };
  
  // Only test service endpoints if service is running
  if (results.service) {
    results.market = await testMarketInfo();
    results.balance = await testBalance();
    results.positions = await testPositions();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary:\n');
  
  Object.entries(results).forEach(([key, passed]) => {
    const icon = passed ? '✅' : '❌';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    console.log(`   ${icon} ${label}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (allPassed) {
    console.log('✅ All tests passed! Hyperliquid integration is ready.');
    console.log('\n📋 Next steps:');
    console.log('   1. Deploy an agent with HYPERLIQUID venue');
    console.log('   2. Run one-click setup from My Deployments');
    console.log('   3. Bridge USDC to Hyperliquid');
    console.log('   4. Start trading!');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.');
    console.log('\n📋 Common fixes:');
    console.log('   - Start Python service: python services/hyperliquid-service.py');
    console.log('   - Add tokens: npx tsx scripts/add-hyperliquid-tokens.ts');
    console.log('   - Set encryption key in .env');
  }
  
  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

main();

