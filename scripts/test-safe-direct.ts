/**
 * Direct Safe Deployment Test
 * Uses private key to deploy Safe + enable module programmatically
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Safe contracts on Arbitrum Sepolia
const SAFE_PROXY_FACTORY = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON = '0x41675C099F32341bf84BFc5382aF534df5C7461a';

// Module address
const MODULE_ADDRESS = '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';

// Safe Proxy Factory ABI (minimal)
const FACTORY_ABI = [
  'function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address)',
  'function proxyCreationCode() view returns (bytes)',
];

// Safe ABI (minimal)
const SAFE_ABI = [
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external',
  'function enableModule(address module) external',
  'function isModuleEnabled(address module) view returns (bool)',
  'function getOwners() view returns (address[])',
  'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) payable returns (bool)',
];

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

async function testSafeDeployment() {
  console.log('🧪 Direct Safe Deployment Test\n');
  console.log('='.repeat(60));
  
  // Get private key
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ No EXECUTOR_PRIVATE_KEY found in .env');
    process.exit(1);
  }

  try {
    // Setup
    console.log('📡 Connecting to Arbitrum Sepolia...');
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const owner = wallet.address;
    
    console.log('✅ Connected!');
    console.log('- Owner:', owner);
    
    const balance = await provider.getBalance(owner);
    console.log('- Balance:', ethers.utils.formatEther(balance), 'ETH');
    
    if (balance.eq(0)) {
      console.log('\n⚠️  No balance! Get testnet ETH from:');
      console.log('https://faucet.quicknode.com/arbitrum/sepolia');
      process.exit(1);
    }
    console.log('');

    // STEP 1: Deploy Safe using Proxy Factory
    console.log('🚀 STEP 1/2: Deploying Safe...');
    
    const factory = new ethers.Contract(SAFE_PROXY_FACTORY, FACTORY_ABI, wallet);
    const safeSingleton = new ethers.Contract(SAFE_SINGLETON, SAFE_ABI, wallet);
    
    // Encode Safe setup (standard setup, no module yet)
    const setupData = safeSingleton.interface.encodeFunctionData('setup', [
      [owner],                                          // owners
      1,                                                // threshold
      ethers.constants.AddressZero,                    // to
      '0x',                                             // data
      ethers.constants.AddressZero,                    // fallbackHandler
      ethers.constants.AddressZero,                    // paymentToken
      0,                                                // payment
      ethers.constants.AddressZero,                    // paymentReceiver
    ]);

    console.log('- Creating Safe proxy...');
    const saltNonce = Date.now(); // Random nonce
    
    const deployTx = await factory.createProxyWithNonce(
      SAFE_SINGLETON,
      setupData,
      saltNonce,
      {
        gasLimit: 3000000,
      }
    );
    
    console.log('- Transaction sent:', deployTx.hash);
    console.log('- Waiting for confirmation...');
    
    const receipt = await deployTx.wait();
    console.log('✅ Transaction confirmed!');
    
    // Find Safe address from event logs
    const createEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === 'ProxyCreation';
      } catch {
        return false;
      }
    });

    let safeAddress: string;
    if (createEvent) {
      const parsed = factory.interface.parseLog(createEvent);
      safeAddress = parsed.args.proxy;
    } else {
      // Fallback: compute Safe address
      console.log('⚠️  Could not find ProxyCreation event, computing address...');
      // This is simplified - in reality would need to compute CREATE2 address
      throw new Error('Could not determine Safe address from transaction');
    }

    console.log('✅ Safe deployed!');
    console.log('- Safe Address:', safeAddress);
    console.log('- Gas used:', receipt.gasUsed.toString());
    console.log('');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 2: Enable Module
    console.log('🔐 STEP 2/2: Enabling module...');
    console.log('- Module:', MODULE_ADDRESS);
    
    const safe = new ethers.Contract(safeAddress, SAFE_ABI, wallet);
    
    // Check current owners
    const owners = await safe.getOwners();
    console.log('- Safe owners:', owners);
    
    // Encode enableModule call
    const enableModuleData = safe.interface.encodeFunctionData('enableModule', [MODULE_ADDRESS]);
    
    // Execute via execTransaction (since we're the owner with threshold 1)
    console.log('- Creating enableModule transaction...');
    
    // For threshold=1, we can directly call enableModule
    // But it's better to use execTransaction for consistency
    const enableTx = await safe.enableModule(MODULE_ADDRESS, {
      gasLimit: 500000,
    });
    
    console.log('- Transaction sent:', enableTx.hash);
    console.log('- Waiting for confirmation...');
    
    const enableReceipt = await enableTx.wait();
    console.log('✅ Module enabled!');
    console.log('- Gas used:', enableReceipt.gasUsed.toString());
    console.log('');

    // STEP 3: Verify
    console.log('🔍 STEP 3: Verifying...');
    const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    
    console.log('- Module enabled:', isEnabled);
    console.log('');

    if (isEnabled) {
      console.log('🎉 SUCCESS! 🎉');
      console.log('');
      console.log('Summary:');
      console.log('- Safe Address:', safeAddress);
      console.log('- Module Enabled:', isEnabled);
      console.log('- Owner:', owner);
      console.log('');
      console.log('View on Explorer:');
      console.log(`https://sepolia.arbiscan.io/address/${safeAddress}`);
      console.log('');
      console.log('✅ Safe deployment with module enablement WORKS!');
      console.log('✅ This proves the concept works without Safe UI!');
    } else {
      console.log('❌ FAILED: Module not enabled');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

console.log('='.repeat(60));
console.log('  SAFE DEPLOYMENT TEST (Direct Method)');
console.log('='.repeat(60));
console.log('');

testSafeDeployment()
  .then(() => {
    console.log('');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

