#!/usr/bin/env tsx
/**
 * Debug the failed trade transaction
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const TX_HASH = '0xd810b2e8eff4a11906fe1d4fb0c099c591eb48fc07248169c03b09a003fdcd79';

async function debug() {
  console.log('🔍 Debugging Failed Trade\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  
  console.log('Transaction Hash:', TX_HASH);
  console.log('View on Etherscan: https://sepolia.etherscan.io/tx/' + TX_HASH);
  console.log('');

  try {
    const tx = await provider.getTransaction(TX_HASH);
    const receipt = await provider.getTransactionReceipt(TX_HASH);

    console.log('Transaction Details:');
    console.log('  From:', tx.from);
    console.log('  To (Module):', tx.to);
    console.log('  Gas Used:', receipt.gasUsed.toString(), 'gas');
    console.log('  Status:', receipt.status === 0 ? '❌ FAILED' : '✅ SUCCESS');
    console.log('');

    // Decode the transaction input
    const MODULE_ABI = [
      'function executeTrade(tuple(address safe, address fromToken, address toToken, uint256 amountIn, address dexRouter, bytes swapData, uint256 minAmountOut, address profitReceiver) params)',
    ];

    const iface = new ethers.utils.Interface(MODULE_ABI);
    
    try {
      const decoded = iface.parseTransaction({ data: tx.data });
      console.log('Decoded Trade Parameters:');
      console.log('  Function:', decoded.name);
      console.log('  Safe:', decoded.args.params.safe);
      console.log('  From Token:', decoded.args.params.fromToken, '(USDC)');
      console.log('  To Token:', decoded.args.params.toToken, '(WETH)');
      console.log('  Amount In:', ethers.utils.formatUnits(decoded.args.params.amountIn, 6), 'USDC');
      console.log('  Min Amount Out:', ethers.utils.formatUnits(decoded.args.params.minAmountOut, 18), 'WETH');
      console.log('  DEX Router:', decoded.args.params.dexRouter);
      console.log('');
    } catch (e) {
      console.log('Could not decode transaction data');
    }

    // Try to get revert reason
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Checking Revert Reason...\n');

    try {
      // Try to replay the transaction
      await provider.call(tx, tx.blockNumber);
    } catch (error: any) {
      console.log('Revert Reason Found:');
      
      if (error.data) {
        try {
          // Try to decode error
          const errorSig = error.data.substring(0, 10);
          console.log('  Error Signature:', errorSig);
          
          // Common error signatures
          const errorTypes: Record<string, string> = {
            '0x08c379a0': 'Error(string)', // Standard revert
            '0x4e487b71': 'Panic(uint256)', // Panic
          };
          
          if (errorTypes[errorSig]) {
            console.log('  Error Type:', errorTypes[errorSig]);
            
            // Try to decode the message
            if (errorSig === '0x08c379a0') {
              const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + error.data.substring(10));
              console.log('  Message:', reason[0]);
            }
          }
        } catch (decodeError) {
          console.log('  Raw:', error.data);
        }
      } else if (error.reason) {
        console.log('  Reason:', error.reason);
      } else if (error.message) {
        console.log('  Message:', error.message);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Possible Issues:\n');
    console.log('1. Slippage - minAmountOut too high (price moved)');
    console.log('2. Swap path incorrect');
    console.log('3. Pool fee tier mismatch');
    console.log('4. Module validation failed');
    console.log('5. Uniswap router error\n');

  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

debug().catch(console.error);
