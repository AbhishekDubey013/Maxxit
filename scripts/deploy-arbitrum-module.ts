#!/usr/bin/env tsx

/**
 * Deploy MaxxitTradingModule to Arbitrum Mainnet
 * 
 * This is a simplified deployment script specifically for Arbitrum.
 * Use this instead of the generic deploy-module.ts
 * 
 * Required env vars:
 * - DEPLOYER_PRIVATE_KEY: Private key with 0.01+ ETH on Arbitrum
 * - PLATFORM_FEE_RECEIVER: Address to receive 0.2 USDC trade fees
 * - PLATFORM_PROFIT_RECEIVER: Address to receive 20% profit share
 * - MODULE_OWNER: Address that can manage whitelists
 * - ARBITRUM_RPC: RPC URL for Arbitrum (optional, has default)
 * 
 * Usage:
 *   npx tsx scripts/deploy-arbitrum-module.ts
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Arbitrum mainnet configuration
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function main() {
  console.log('🚀 Deploying MaxxitTradingModule to Arbitrum Mainnet');
  console.log('====================================================\n');

  // Validate environment
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }

  if (!process.env.PLATFORM_FEE_RECEIVER) {
    throw new Error('PLATFORM_FEE_RECEIVER not set in .env');
  }

  if (!process.env.PLATFORM_PROFIT_RECEIVER) {
    throw new Error('PLATFORM_PROFIT_RECEIVER not set in .env (can be same as FEE_RECEIVER)');
  }

  if (!process.env.MODULE_OWNER) {
    throw new Error('MODULE_OWNER not set in .env');
  }

  // Setup provider and deployer
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('Deployer Configuration:');
  console.log('=======================');
  console.log('Deployer Address:', deployer.address);
  
  const balance = await deployer.getBalance();
  console.log('Deployer Balance:', ethers.utils.formatEther(balance), 'ETH');
  
  if (balance.lt(ethers.utils.parseEther('0.005'))) {
    console.warn('⚠️  Warning: Low ETH balance! Deployment may fail.');
    console.warn('   Recommended: 0.01+ ETH');
  }

  const network = await provider.getNetwork();
  console.log('Network:', network.name, `(${network.chainId})`);
  
  if (network.chainId !== ARBITRUM_CHAIN_ID) {
    throw new Error(`Wrong network! Expected Arbitrum (42161), got ${network.chainId}`);
  }

  console.log('');

  // Module configuration
  const platformFeeReceiver = process.env.PLATFORM_FEE_RECEIVER;
  const platformProfitReceiver = process.env.PLATFORM_PROFIT_RECEIVER;
  const moduleOwner = process.env.MODULE_OWNER;

  console.log('Module Configuration:');
  console.log('=====================');
  console.log('Platform Fee Receiver:', platformFeeReceiver);
  console.log('Platform Profit Receiver:', platformProfitReceiver);
  console.log('Module Owner:', moduleOwner);
  console.log('USDC Address:', USDC_ARBITRUM);
  console.log('Trade Fee: 0.2 USDC');
  console.log('Profit Share: 20%');
  console.log('');

  // Load contract
  console.log('📝 Loading contract...');
  
  const contractPath = path.join(__dirname, '../contracts/modules/MaxxitTradingModule.sol');
  if (!fs.existsSync(contractPath)) {
    throw new Error('Contract file not found: ' + contractPath);
  }

  // Read contract source
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  
  // For deployment, we'll need the compiled artifact
  // This assumes you've compiled with hardhat
  const artifactPath = path.join(__dirname, '../artifacts/contracts/modules/MaxxitTradingModule.sol/MaxxitTradingModule.json');
  
  if (!fs.existsSync(artifactPath)) {
    console.log('⚠️  Contract not compiled. Compiling now...');
    console.log('   Run: npx hardhat compile');
    throw new Error('Please compile contract first: npx hardhat compile');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  console.log('✅ Contract loaded');
  console.log('');

  // Deploy contract
  console.log('🚀 Deploying contract...');
  console.log('   This may take 30-60 seconds...');
  console.log('');

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  // Get current gas prices from network with 10% buffer for network fluctuations
  const feeData = await provider.getFeeData();
  const baseGasPrice = feeData.gasPrice || ethers.utils.parseUnits('0.1', 'gwei');
  const gasPrice = baseGasPrice.mul(110).div(100); // Add 10% buffer
  
  console.log('Base gas price:', ethers.utils.formatUnits(baseGasPrice, 'gwei'), 'gwei');
  console.log('Using gas price (with 10% buffer):', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('Estimated cost:', ethers.utils.formatEther(gasPrice.mul(2800000)), 'ETH');
  console.log('');

  const module = await factory.deploy(
    platformFeeReceiver,
    USDC_ARBITRUM,
    moduleOwner,
    {
      gasLimit: 2800000, // Sufficient gas limit
      gasPrice: gasPrice, // Use gas price with buffer
    }
  );

  console.log('📤 Transaction sent:', module.deployTransaction.hash);
  console.log('   Waiting for confirmation...');
  console.log('');

  await module.deployed();

  console.log('✅ Contract deployed successfully!');
  console.log('');

  // Deployment info
  const deploymentInfo = {
    address: module.address,
    chainId: ARBITRUM_CHAIN_ID,
    network: 'Arbitrum One',
    deployer: deployer.address,
    deploymentTx: module.deployTransaction.hash,
    platformFeeReceiver,
    platformProfitReceiver,
    moduleOwner,
    usdc: USDC_ARBITRUM,
    tradeFee: '0.2 USDC',
    profitShare: '20%',
    deployedAt: new Date().toISOString(),
  };

  console.log('📊 Deployment Information:');
  console.log('==========================');
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log('');

  // Save deployment info
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, 'arbitrum-module.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('💾 Deployment info saved to:', deploymentFile);
  console.log('');

  // Next steps
  console.log('🎉 Deployment Complete!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('==============');
  console.log('');
  console.log('1. Update .env with module address:');
  console.log(`   TRADING_MODULE_ADDRESS=${module.address}`);
  console.log('');
  console.log('2. Verify contract on Arbiscan:');
  console.log(`   npx hardhat verify --network arbitrum \\`);
  console.log(`     ${module.address} \\`);
  console.log(`     ${platformFeeReceiver} \\`);
  console.log(`     ${platformProfitReceiver} \\`);
  console.log(`     ${USDC_ARBITRUM} \\`);
  console.log(`     ${moduleOwner}`);
  console.log('');
  console.log('3. Configure module:');
  console.log('   npx tsx scripts/setup-arbitrum-module.ts');
  console.log('');
  console.log('4. View on Arbiscan:');
  console.log(`   https://arbiscan.io/address/${module.address}`);
  console.log('');

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

