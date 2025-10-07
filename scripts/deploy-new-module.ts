#!/usr/bin/env tsx
/**
 * Deploy Updated MaxxitTradingModule to Sepolia
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

async function deployModule() {
  console.log('🚀 Deploying Updated MaxxitTradingModule\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log('Deployer:', deployer.address);
  console.log('Network: Sepolia (chainId: 11155111)');
  console.log('');

  // Load compiled contract
  const artifact = JSON.parse(fs.readFileSync('./artifacts/MaxxitTradingModule.json', 'utf8'));

  console.log('Contract Details:');
  console.log('  Bytecode size:', (artifact.bytecode.length - 2) / 2, 'bytes');
  console.log('');

  // Deploy parameters
  const platformFeeReceiver = deployer.address;
  const moduleOwner = deployer.address;

  console.log('Constructor Parameters:');
  console.log('  platformFeeReceiver:', platformFeeReceiver);
  console.log('  USDC:', USDC);
  console.log('  moduleOwner:', moduleOwner);
  console.log('');

  try {
    // Create contract factory
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

    console.log('📝 Deploying contract...');
    console.log('   This may take 30-60 seconds...');
    console.log('');

    // Deploy
    const contract = await factory.deploy(
      platformFeeReceiver,
      USDC,
      moduleOwner,
      {
        gasLimit: 3000000,
      }
    );

    console.log('   Transaction sent:', contract.deployTransaction.hash);
    console.log('   Waiting for confirmation...');
    console.log('');

    await contract.deployed();

    console.log('✅ Module deployed successfully!');
    console.log('');
    console.log('   Module Address:', contract.address);
    console.log('   Block:', contract.deployTransaction.blockNumber);
    console.log('   Gas used:', contract.deployTransaction.gasLimit.toString());
    console.log('');
    console.log('   View on Etherscan:');
    console.log(`   https://sepolia.etherscan.io/address/${contract.address}`);
    console.log('');

    // Save deployment info
    const deployment = {
      network: 'sepolia',
      chainId: 11155111,
      moduleAddress: contract.address,
      deployer: deployer.address,
      txHash: contract.deployTransaction.hash,
      blockNumber: contract.deployTransaction.blockNumber,
      timestamp: new Date().toISOString(),
      config: {
        usdc: USDC,
        platformFeeReceiver,
        moduleOwner,
      },
      features: [
        'approveTokenForDex() - one-time token approval',
        'No per-trade approval - more gas efficient',
        'All previous features intact',
      ],
    };

    fs.writeFileSync(
      './deployments/sepolia-module-v2.json',
      JSON.stringify(deployment, null, 2)
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Next Steps:\n');
    console.log('1. Authorize executor:');
    console.log(`   module.setExecutorAuthorization("${deployer.address}", true)`);
    console.log('');
    console.log('2. Whitelist tokens:');
    console.log(`   module.setTokenWhitelist("${USDC}", true)`);
    console.log(`   module.setTokenWhitelist("0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", true) // WETH`);
    console.log('');
    console.log('3. Whitelist DEX:');
    console.log(`   module.setDexWhitelist("0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", true)`);
    console.log('');
    console.log('4. Enable module on Safe via Safe UI');
    console.log('');
    console.log('5. Call approveTokenForDex:');
    console.log(`   module.approveTokenForDex(safeAddress, USDC, uniswapRouter)`);
    console.log('');
    console.log('6. Initialize capital');
    console.log('');
    console.log('7. Execute trades! 🚀');

  } catch (error: any) {
    console.log('❌ Deployment failed:', error.message);
    if (error.transaction) {
      console.log('   Transaction:', error.transaction.hash);
    }
  }
}

deployModule().catch(console.error);
