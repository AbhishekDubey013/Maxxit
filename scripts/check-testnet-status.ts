/**
 * Check Hyperliquid Testnet Status
 * 
 * Verifies testnet configuration and service status
 * 
 * Usage:
 * npx tsx scripts/check-testnet-status.ts
 */

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';
const IS_TESTNET = process.env.HYPERLIQUID_TESTNET === 'true';

async function checkServiceStatus() {
  console.log('🔍 Checking Hyperliquid service status...\n');
  
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Service is running:');
      console.log(`   Status: ${data.status}`);
      console.log(`   Network: ${data.network?.toUpperCase() || 'UNKNOWN'}`);
      console.log(`   Base URL: ${data.baseUrl}`);
      
      if (IS_TESTNET && data.network !== 'testnet') {
        console.log('\n⚠️  WARNING: Environment says testnet but service is on mainnet!');
        console.log('   Set: export HYPERLIQUID_TESTNET=true');
        console.log('   Then restart: python services/hyperliquid-service.py');
        return false;
      }
      
      if (!IS_TESTNET && data.network === 'testnet') {
        console.log('\n⚠️  WARNING: Environment says mainnet but service is on testnet!');
        console.log('   Unset: unset HYPERLIQUID_TESTNET');
        console.log('   Then restart: python services/hyperliquid-service.py');
        return false;
      }
      
      return true;
    } else {
      console.log('❌ Service returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Service is not running or not accessible');
    console.log('\n💡 Start the service:');
    if (IS_TESTNET) {
      console.log('   HYPERLIQUID_TESTNET=true python services/hyperliquid-service.py');
    } else {
      console.log('   python services/hyperliquid-service.py');
    }
    return false;
  }
}

async function checkEnvironment() {
  console.log('\n🔍 Checking environment configuration...\n');
  
  const checks = {
    'HYPERLIQUID_TESTNET': process.env.HYPERLIQUID_TESTNET,
    'HYPERLIQUID_SERVICE_URL': process.env.HYPERLIQUID_SERVICE_URL,
    'AGENT_WALLET_ENCRYPTION_KEY': process.env.AGENT_WALLET_ENCRYPTION_KEY ? '✓ Set' : undefined,
  };
  
  let allGood = true;
  
  Object.entries(checks).forEach(([key, value]) => {
    if (value) {
      console.log(`✅ ${key}: ${value}`);
    } else {
      console.log(`⚠️  ${key}: Not set`);
      if (key === 'AGENT_WALLET_ENCRYPTION_KEY') {
        allGood = false;
      }
    }
  });
  
  return allGood;
}

async function testTestnetConnection() {
  console.log('\n🔍 Testing testnet connection...\n');
  
  try {
    // Test market info
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: 'BTC' }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Successfully connected to Hyperliquid testnet');
      console.log(`   BTC Price: $${data.price?.toLocaleString() || 'N/A'}`);
      console.log(`   Max Leverage: ${data.maxLeverage || 'N/A'}x`);
      return true;
    } else {
      console.log('❌ Failed to connect:', data.error);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function showTestnetInfo() {
  console.log('\n📋 Testnet Information:\n');
  console.log('🌐 Hyperliquid Testnet:');
  console.log('   App: https://app.hyperliquid-testnet.xyz');
  console.log('   API: https://api.hyperliquid-testnet.xyz');
  console.log('   Faucet: Get USDC on the testnet app\n');
  
  console.log('🌐 Arbitrum Sepolia:');
  console.log('   Chain ID: 421614');
  console.log('   RPC: https://sepolia-rollup.arbitrum.io/rpc');
  console.log('   Faucet: https://faucet.quicknode.com/arbitrum/sepolia\n');
  
  console.log('💡 Quick Start:');
  console.log('   1. Get Sepolia ETH for gas');
  console.log('   2. Deploy agent on Arbitrum Sepolia');
  console.log('   3. Run setup to generate agent wallet');
  console.log('   4. Get testnet USDC from Hyperliquid app');
  console.log('   5. Transfer to agent wallet');
  console.log('   6. Start trading!\n');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Hyperliquid Testnet Status Check                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const results = {
    service: await checkServiceStatus(),
    environment: await checkEnvironment(),
    connection: false,
  };
  
  if (results.service) {
    results.connection = await testTestnetConnection();
  }
  
  await showTestnetInfo();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Status Summary:\n');
  
  console.log(`   Service: ${results.service ? '✅ Running' : '❌ Not Running'}`);
  console.log(`   Environment: ${results.environment ? '✅ Configured' : '⚠️  Missing Keys'}`);
  console.log(`   Connection: ${results.connection ? '✅ Connected' : '❌ Not Connected'}`);
  
  const mode = IS_TESTNET ? 'TESTNET 🧪' : 'MAINNET ⚡';
  console.log(`\n   Mode: ${mode}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.service && results.environment && results.connection) {
    console.log('✅ Everything looks good! Ready for testnet trading.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some issues detected. Please fix them before continuing.\n');
    process.exit(1);
  }
}

main();

