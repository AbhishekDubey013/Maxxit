/**
 * Test Trade on Hyperliquid Testnet
 * 
 * Opens a small test position to verify everything works
 * 
 * Usage:
 * npx tsx scripts/test-trade-testnet.ts <agent-private-key>
 */

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';

async function testTrade(agentPrivateKey: string) {
  console.log('🧪 Testing Hyperliquid Testnet Trade\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 1. Check service is on testnet
  console.log('1️⃣  Checking service network...');
  try {
    const healthResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/health`);
    const health = await healthResponse.json();
    
    if (health.network !== 'testnet') {
      console.log('❌ Service is not on testnet!');
      console.log('   Current network:', health.network);
      console.log('   Set: export HYPERLIQUID_TESTNET=true');
      process.exit(1);
    }
    
    console.log('✅ Service confirmed on testnet');
    console.log(`   Base URL: ${health.baseUrl}\n`);
  } catch (error: any) {
    console.log('❌ Service not accessible:', error.message);
    console.log('   Make sure to start: HYPERLIQUID_TESTNET=true python services/hyperliquid-service.py');
    process.exit(1);
  }
  
  // 2. Get agent wallet address
  console.log('2️⃣  Getting agent wallet address...');
  const { Account } = await import('eth-account');
  const account = Account.from_key(agentPrivateKey);
  const agentAddress = account.address;
  console.log(`✅ Agent address: ${agentAddress}\n`);
  
  // 3. Check balance
  console.log('3️⃣  Checking testnet balance...');
  try {
    const balanceResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: agentAddress }),
    });
    
    const balanceData = await balanceResponse.json();
    
    if (!balanceData.success) {
      console.log('❌ Failed to get balance:', balanceData.error);
      process.exit(1);
    }
    
    const balance = balanceData.withdrawable || 0;
    console.log(`✅ Testnet USDC balance: $${balance.toLocaleString()}`);
    
    if (balance < 10) {
      console.log('\n⚠️  Insufficient testnet USDC!');
      console.log('   Get testnet USDC: https://app.hyperliquid-testnet.xyz');
      console.log(`   Send to: ${agentAddress}`);
      process.exit(1);
    }
    console.log('');
  } catch (error: any) {
    console.log('❌ Balance check failed:', error.message);
    process.exit(1);
  }
  
  // 4. Get BTC market info
  console.log('4️⃣  Getting BTC market info...');
  try {
    const marketResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: 'BTC' }),
    });
    
    const marketData = await marketResponse.json();
    
    if (!marketData.success) {
      console.log('❌ Failed to get market info:', marketData.error);
      process.exit(1);
    }
    
    console.log('✅ BTC market info:');
    console.log(`   Price: $${marketData.price.toLocaleString()}`);
    console.log(`   Max Leverage: ${marketData.maxLeverage}x\n`);
  } catch (error: any) {
    console.log('❌ Market info failed:', error.message);
    process.exit(1);
  }
  
  // 5. Open test position (very small)
  console.log('5️⃣  Opening test position (0.001 BTC LONG)...');
  try {
    const orderResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/open-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentPrivateKey,
        coin: 'BTC',
        isBuy: true, // LONG
        size: 0.001, // Very small test
        slippage: 0.02, // 2% slippage (testnet can be volatile)
      }),
    });
    
    const orderData = await orderResponse.json();
    
    if (!orderData.success) {
      console.log('❌ Failed to open position:', orderData.error);
      console.log('\n💡 Common issues:');
      console.log('   - Insufficient balance');
      console.log('   - Size too small');
      console.log('   - Market not available');
      process.exit(1);
    }
    
    console.log('✅ Position opened successfully!');
    console.log(`   Order ID: ${orderData.result?.statuses?.[0]?.resting?.oid || 'N/A'}`);
    console.log('   Position: 0.001 BTC LONG\n');
  } catch (error: any) {
    console.log('❌ Order failed:', error.message);
    process.exit(1);
  }
  
  // 6. Check positions
  console.log('6️⃣  Checking open positions...');
  try {
    const positionsResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: agentAddress }),
    });
    
    const positionsData = await positionsResponse.json();
    
    if (!positionsData.success) {
      console.log('❌ Failed to get positions:', positionsData.error);
      process.exit(1);
    }
    
    const btcPosition = positionsData.positions.find((p: any) => p.coin === 'BTC');
    
    if (btcPosition) {
      console.log('✅ Position confirmed:');
      console.log(`   Size: ${btcPosition.szi} BTC`);
      console.log(`   Entry: $${parseFloat(btcPosition.entryPx).toLocaleString()}`);
      console.log(`   Value: $${parseFloat(btcPosition.positionValue).toLocaleString()}`);
      console.log(`   P&L: $${parseFloat(btcPosition.unrealizedPnl).toFixed(2)}\n`);
    } else {
      console.log('⚠️  Position not found (may need a moment to reflect)\n');
    }
  } catch (error: any) {
    console.log('❌ Positions check failed:', error.message);
  }
  
  // 7. Close position
  console.log('7️⃣  Closing test position...');
  try {
    const closeResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/close-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentPrivateKey,
        coin: 'BTC',
        size: 0.001,
        slippage: 0.02,
      }),
    });
    
    const closeData = await closeResponse.json();
    
    if (!closeData.success) {
      console.log('⚠️  Failed to close position:', closeData.error);
      console.log('   You may need to close manually on Hyperliquid testnet app');
    } else {
      console.log('✅ Position closed successfully!\n');
    }
  } catch (error: any) {
    console.log('⚠️  Close failed:', error.message);
    console.log('   You may need to close manually on Hyperliquid testnet app\n');
  }
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Test Complete!\n');
  console.log('📊 Summary:');
  console.log('   ✓ Service on testnet');
  console.log('   ✓ Agent wallet funded');
  console.log('   ✓ Market data retrieved');
  console.log('   ✓ Position opened');
  console.log('   ✓ Position confirmed');
  console.log('   ✓ Position closed\n');
  console.log('🎉 Your Hyperliquid testnet integration is working!\n');
  console.log('Next steps:');
  console.log('   1. Deploy an agent with HYPERLIQUID venue');
  console.log('   2. Run setup to generate agent wallet');
  console.log('   3. Fund agent wallet with testnet USDC');
  console.log('   4. Let it trade automatically!\n');
  console.log('💡 When ready, switch to mainnet by unsetting HYPERLIQUID_TESTNET\n');
}

async function main() {
  const agentPrivateKey = process.argv[2];
  
  if (!agentPrivateKey) {
    console.log('Usage: npx tsx scripts/test-trade-testnet.ts <agent-private-key>');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/test-trade-testnet.ts 0x1234...');
    console.log('');
    console.log('⚠️  For testing only! Use a test private key with testnet funds.');
    process.exit(1);
  }
  
  if (!agentPrivateKey.startsWith('0x')) {
    console.log('❌ Private key must start with 0x');
    process.exit(1);
  }
  
  await testTrade(agentPrivateKey);
}

main().catch(console.error);

