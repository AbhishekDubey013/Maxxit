/**
 * Test Vault Deposit
 * 
 * Deposit USDC into a Hyperliquid vault
 * 
 * Usage:
 * npx tsx scripts/test-vault-deposit.ts <agent-private-key> <vault-address> <amount>
 */

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';

async function testVaultDeposit(agentPrivateKey: string, vaultAddress: string, amount: number) {
  console.log('🏦 Testing Vault Deposit\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Get agent address
    const { Account } = await import('eth-account');
    const account = Account.from_key(agentPrivateKey);
    const agentAddress = account.address;
    
    console.log('📋 Details:');
    console.log(`   Agent: ${agentAddress}`);
    console.log(`   Vault: ${vaultAddress}`);
    console.log(`   Amount: ${amount} USDC\n`);
    
    // Check balance before
    console.log('1️⃣  Checking balance before deposit...');
    const balanceBefore = await fetch(`${HYPERLIQUID_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: agentAddress }),
    });
    
    const balanceBeforeData = await balanceBefore.json();
    if (!balanceBeforeData.success) {
      throw new Error(`Failed to get balance: ${balanceBeforeData.error}`);
    }
    
    const withdrawableBefore = balanceBeforeData.withdrawable || 0;
    console.log(`✅ Current balance: $${withdrawableBefore.toLocaleString()}\n`);
    
    if (withdrawableBefore < amount) {
      console.log(`❌ Insufficient balance! Need $${amount}, have $${withdrawableBefore}`);
      console.log('   Get testnet USDC: https://app.hyperliquid-testnet.xyz');
      process.exit(1);
    }
    
    // Deposit to vault
    console.log('2️⃣  Depositing to vault...');
    const depositResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/vault/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentPrivateKey,
        vaultAddress,
        amount,
      }),
    });
    
    const depositData = await depositResponse.json();
    
    if (!depositData.success) {
      throw new Error(`Deposit failed: ${depositData.error}`);
    }
    
    console.log('✅ Deposit successful!\n');
    console.log('   Transaction:', JSON.stringify(depositData.result, null, 2));
    console.log('');
    
    // Wait a bit for confirmation
    console.log('3️⃣  Waiting for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check vault balance
    console.log('4️⃣  Checking vault balance...');
    const vaultBalanceResponse = await fetch(`${HYPERLIQUID_SERVICE_URL}/vault/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: agentAddress,
        vaultAddress,
      }),
    });
    
    const vaultBalanceData = await vaultBalanceResponse.json();
    
    if (vaultBalanceData.success) {
      console.log(`✅ Vault balance: $${vaultBalanceData.balance.toLocaleString()}\n`);
    } else {
      console.log(`⚠️  Could not verify vault balance (may take a moment to update)\n`);
    }
    
    // Check balance after
    console.log('5️⃣  Checking balance after deposit...');
    const balanceAfter = await fetch(`${HYPERLIQUID_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: agentAddress }),
    });
    
    const balanceAfterData = await balanceAfter.json();
    const withdrawableAfter = balanceAfterData.withdrawable || 0;
    console.log(`✅ Remaining balance: $${withdrawableAfter.toLocaleString()}\n`);
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Deposit Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Deposited: $${amount}`);
    console.log(`   Balance before: $${withdrawableBefore.toLocaleString()}`);
    console.log(`   Balance after: $${withdrawableAfter.toLocaleString()}`);
    console.log(`   Difference: $${(withdrawableBefore - withdrawableAfter).toLocaleString()}\n`);
    console.log('💡 Next steps:');
    console.log('   - Check vault on: https://app.hyperliquid-testnet.xyz/vaults');
    console.log('   - Monitor vault performance');
    console.log('   - Withdraw when ready:\n');
    console.log(`   npx tsx scripts/test-vault-withdraw.ts ${agentPrivateKey.substring(0, 10)}... ${vaultAddress} ${amount}\n`);
    
  } catch (error: any) {
    console.log('❌ Deposit failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.log('Usage: npx tsx scripts/test-vault-deposit.ts <agent-private-key> <vault-address> <amount>');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/test-vault-deposit.ts 0x1234... 0xVaultAddress... 100');
    console.log('');
    console.log('💡 Find vault addresses:');
    console.log('   npx tsx scripts/list-testnet-vaults.ts');
    process.exit(1);
  }
  
  const [agentPrivateKey, vaultAddress, amountStr] = args;
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount) || amount <= 0) {
    console.log('❌ Amount must be a positive number');
    process.exit(1);
  }
  
  if (!agentPrivateKey.startsWith('0x')) {
    console.log('❌ Private key must start with 0x');
    process.exit(1);
  }
  
  if (!vaultAddress.startsWith('0x')) {
    console.log('❌ Vault address must start with 0x');
    process.exit(1);
  }
  
  await testVaultDeposit(agentPrivateKey, vaultAddress, amount);
}

main();

