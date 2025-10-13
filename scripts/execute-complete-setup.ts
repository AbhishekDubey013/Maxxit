/**
 * Execute completeSetup() on the new module via Safe SDK
 * This will approve USDC and initialize capital
 */

import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const SIGNER_KEY = process.env.EXECUTOR_PRIVATE_KEY;

const MODULE_ABI = ['function completeSetup()'];

async function main() {
  if (!SIGNER_KEY) {
    console.error('❌ EXECUTOR_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log('🔧 Executing completeSetup() on new module...\n');
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`Module: ${MODULE_ADDRESS}\n`);

  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC);
    const signer = new ethers.Wallet(SIGNER_KEY, provider);

    console.log(`Signer: ${signer.address}\n`);

    // Initialize Safe SDK
    const safe = await Safe.init({
      provider: RPC,
      signer: SIGNER_KEY,
      safeAddress: SAFE_ADDRESS,
    });

    // Encode the transaction data
    const iface = new ethers.utils.Interface(MODULE_ABI);
    const data = iface.encodeFunctionData('completeSetup', []);

    console.log('📝 Creating Safe transaction...\n');

    // Create transaction
    const safeTransaction = await safe.createTransaction({
      transactions: [
        {
          to: MODULE_ADDRESS,
          value: '0',
          data: data,
        },
      ],
    });

    console.log('✍️  Signing transaction...\n');

    // Sign transaction
    const signedTx = await safe.signTransaction(safeTransaction);

    console.log('📤 Proposing transaction to Safe...\n');

    // Get transaction hash
    const txHash = await safe.getTransactionHash(signedTx);
    console.log(`Transaction Hash: ${txHash}\n`);

    console.log('✅ Transaction signed and ready!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to Safe UI: https://app.safe.global');
    console.log('2. Check pending transactions');
    console.log('3. Sign and execute the transaction\n');

    console.log('Or if this is a 1/1 Safe, we can execute directly...\n');

    // Check threshold
    const threshold = await safe.getThreshold();
    console.log(`Safe Threshold: ${threshold}\n`);

    if (threshold === 1) {
      console.log('🚀 Executing transaction (1/1 Safe)...\n');
      
      const executeTxResponse = await safe.executeTransaction(signedTx);
      console.log(`Execute TX Hash: ${executeTxResponse.hash}`);
      
      console.log('⏳ Waiting for confirmation...\n');
      await executeTxResponse.transactionResponse?.wait();
      
      console.log('✅ Transaction executed successfully!\n');
      console.log('🎉 Module setup complete! USDC is now approved and capital is initialized.\n');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

