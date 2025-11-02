/**
 * List Available Testnet Vaults
 * 
 * Shows all available vaults on Hyperliquid testnet
 * 
 * Usage:
 * npx tsx scripts/list-testnet-vaults.ts
 */

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';
const IS_TESTNET = process.env.HYPERLIQUID_TESTNET === 'true';

async function listVaults() {
  console.log('🏦 Listing Hyperliquid Vaults\n');
  console.log(`Network: ${IS_TESTNET ? 'TESTNET' : 'MAINNET'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Check service is available
    const healthResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Hyperliquid service is not running');
      console.log('   Start it: HYPERLIQUID_TESTNET=true python services/hyperliquid-service.py');
      process.exit(1);
    }
    
    const health = await healthResponse.json();
    if (IS_TESTNET && health.network !== 'testnet') {
      console.log('⚠️  Warning: Environment says testnet but service is on mainnet!');
    }
    
    console.log('📡 Fetching vaults from Hyperliquid API...\n');
    
    // Get vaults info directly from Hyperliquid API
    const apiUrl = IS_TESTNET 
      ? 'https://api.hyperliquid-testnet.xyz/info'
      : 'https://api.hyperliquid.xyz/info';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vaultDetails' }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const vaults = await response.json();
    
    if (!vaults || vaults.length === 0) {
      console.log('📭 No vaults found on this network.\n');
      console.log('💡 Tips:');
      console.log('   - Check https://app.hyperliquid-testnet.xyz/vaults for testnet vaults');
      console.log('   - Testnet vaults may be limited or reset periodically');
      console.log('   - Try mainnet for more active vaults');
      return;
    }
    
    console.log(`📊 Found ${vaults.length} vault(s):\n`);
    
    vaults.forEach((vault: any, index: number) => {
      const vaultAddress = vault.vault || vault.address;
      const name = vault.name || vault.description || 'Unknown Vault';
      const leader = vault.leader || 'Unknown';
      const tvl = vault.tvl ? `$${parseFloat(vault.tvl).toLocaleString()}` : 'N/A';
      const apr = vault.apr ? `${parseFloat(vault.apr).toFixed(2)}%` : 'N/A';
      const minDeposit = vault.minDeposit ? `$${parseFloat(vault.minDeposit).toLocaleString()}` : 'N/A';
      
      console.log(`${index + 1}. ${name}`);
      console.log(`   Address: ${vaultAddress}`);
      console.log(`   Leader: ${leader.substring(0, 10)}...${leader.substring(leader.length - 8)}`);
      console.log(`   TVL: ${tvl}`);
      console.log(`   APR: ${apr}`);
      console.log(`   Min Deposit: ${minDeposit}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 How to use a vault:\n');
    console.log('1. Copy a vault address from above');
    console.log('2. Test deposit:');
    console.log('   npx tsx scripts/test-vault-deposit.ts <agent-key> <vault-address> 100\n');
    console.log('3. Check balance:');
    console.log('   npx tsx scripts/test-vault-balance.ts <agent-address> <vault-address>\n');
    console.log('4. Withdraw:');
    console.log('   npx tsx scripts/test-vault-withdraw.ts <agent-key> <vault-address> 50\n');
    
    // Save vault addresses to config file
    const vaultAddresses = vaults.map((v: any) => ({
      address: v.vault || v.address,
      name: v.name || v.description || 'Unknown',
      leader: v.leader,
    }));
    
    const fs = await import('fs');
    const configPath = './vault-config.json';
    fs.writeFileSync(
      configPath,
      JSON.stringify({ 
        network: IS_TESTNET ? 'testnet' : 'mainnet',
        vaults: vaultAddresses,
        updatedAt: new Date().toISOString()
      }, null, 2)
    );
    
    console.log(`✅ Vault addresses saved to: ${configPath}\n`);
    
  } catch (error: any) {
    console.log('❌ Error fetching vaults:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure Hyperliquid service is running');
    console.log('   - Check network connectivity');
    console.log('   - Verify you\'re on the right network (testnet/mainnet)');
    process.exit(1);
  }
}

async function main() {
  await listVaults();
}

main();

