/**
 * Deploy MaxxitTradingModuleV2 to Arbitrum
 * Supports both SPOT and GMX perpetual trading
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Arbitrum One RPC
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

// Deployment config
const PLATFORM_FEE_RECEIVER = process.env.PLATFORM_FEE_RECEIVER || process.env.EXECUTOR_ADDRESS;
const MODULE_OWNER = process.env.MODULE_OWNER || process.env.EXECUTOR_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;

// Token addresses (Arbitrum One)
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// GMX V2 addresses (Arbitrum One)
const GMX_EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const GMX_READER = '0xf60becbba223EEA9495Da3f606753867eC10d139';

async function main() {
  console.log('\n🚀 Deploying MaxxitTradingModuleV2 to Arbitrum One...\n');

  // Validation
  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not found in environment');
  }

  if (!PLATFORM_FEE_RECEIVER) {
    throw new Error('PLATFORM_FEE_RECEIVER not found in environment');
  }

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log('📋 Deployment Configuration:');
  console.log('├─ Network: Arbitrum One');
  console.log(`├─ Deployer: ${deployer.address}`);
  console.log(`├─ Platform Fee Receiver: ${PLATFORM_FEE_RECEIVER}`);
  console.log(`├─ Module Owner: ${MODULE_OWNER}`);
  console.log(`├─ USDC: ${USDC_ADDRESS}`);
  console.log(`├─ GMX ExchangeRouter: ${GMX_EXCHANGE_ROUTER}`);
  console.log(`├─ GMX Router: ${GMX_ROUTER}`);
  console.log(`└─ GMX Reader: ${GMX_READER}\n`);

  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log(`💰 Deployer ETH balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.lt(ethers.utils.parseEther('0.01'))) {
    throw new Error('Insufficient ETH balance for deployment (need at least 0.01 ETH)');
  }

  // Read compiled contract
  const contractPath = path.join(__dirname, '../artifacts/MaxxitTradingModuleV2.json');
  
  if (!fs.existsSync(contractPath)) {
    throw new Error(
      `Contract artifact not found at ${contractPath}\n` +
      'Please compile first: npx hardhat compile'
    );
  }

  const artifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  // Create contract factory
  const ModuleFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  // Estimate gas
  console.log('⛽ Estimating gas...');
  const deployTx = ModuleFactory.getDeployTransaction(
    PLATFORM_FEE_RECEIVER,
    USDC_ADDRESS,
    MODULE_OWNER,
    GMX_EXCHANGE_ROUTER,
    GMX_ROUTER,
    GMX_READER
  );
  
  const estimatedGas = await provider.estimateGas(deployTx);
  console.log(`├─ Estimated gas: ${estimatedGas.toString()}`);
  
  const gasPrice = await provider.getGasPrice();
  console.log(`├─ Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  
  const estimatedCost = estimatedGas.mul(gasPrice);
  console.log(`└─ Estimated cost: ${ethers.utils.formatEther(estimatedCost)} ETH\n`);

  // Deploy
  console.log('📤 Deploying contract...');
  const module = await ModuleFactory.deploy(
    PLATFORM_FEE_RECEIVER,
    USDC_ADDRESS,
    MODULE_OWNER,
    GMX_EXCHANGE_ROUTER,
    GMX_ROUTER,
    GMX_READER,
    {
      gasLimit: estimatedGas.mul(120).div(100), // 20% buffer
    }
  );

  console.log(`├─ Transaction hash: ${module.deployTransaction.hash}`);
  console.log('├─ Waiting for confirmation...');

  await module.deployed();

  console.log(`└─ ✅ Module deployed at: ${module.address}\n`);

  // Verify deployment
  console.log('🔍 Verifying deployment...');
  
  const platformReceiver = await module.platformFeeReceiver();
  const usdc = await module.USDC();
  const owner = await module.moduleOwner();
  const gmxRouter = await module.GMX_EXCHANGE_ROUTER();
  const tradeFee = await module.TRADE_FEE();
  const profitShareBps = await module.PROFIT_SHARE_BPS();

  console.log(`├─ Platform Fee Receiver: ${platformReceiver} ${platformReceiver === PLATFORM_FEE_RECEIVER ? '✅' : '❌'}`);
  console.log(`├─ USDC: ${usdc} ${usdc === USDC_ADDRESS ? '✅' : '❌'}`);
  console.log(`├─ Module Owner: ${owner} ${owner === MODULE_OWNER ? '✅' : '❌'}`);
  console.log(`├─ GMX Router: ${gmxRouter} ${gmxRouter === GMX_EXCHANGE_ROUTER ? '✅' : '❌'}`);
  console.log(`├─ Trade Fee: ${ethers.utils.formatUnits(tradeFee, 6)} USDC`);
  console.log(`└─ Profit Share: ${profitShareBps.toNumber() / 100}%\n`);

  // Authorize executor
  console.log('🔐 Authorizing executor...');
  const authTx = await module.setExecutorAuthorization(deployer.address, true);
  await authTx.wait();
  console.log(`└─ ✅ Executor ${deployer.address} authorized\n`);

  // Save deployment info
  const deployment = {
    network: 'arbitrum-one',
    chainId: 42161,
    moduleAddress: module.address,
    moduleVersion: 'v2',
    deployedAt: new Date().toISOString(),
    deploymentTx: module.deployTransaction.hash,
    deployer: deployer.address,
    config: {
      platformFeeReceiver: PLATFORM_FEE_RECEIVER,
      usdc: USDC_ADDRESS,
      moduleOwner: MODULE_OWNER,
      gmxExchangeRouter: GMX_EXCHANGE_ROUTER,
      gmxRouter: GMX_ROUTER,
      gmxReader: GMX_READER,
      tradeFee: '0.2 USDC',
      profitShare: '20%',
    },
  };

  const deploymentPath = path.join(__dirname, '../deployments/arbitrum-module-v2.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Module Address: ${module.address}`);
  console.log(`🔗 Explorer: https://arbiscan.io/address/${module.address}`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log(`1. Update .env with: MODULE_ADDRESS_V2=${module.address}`);
  console.log('2. Whitelist tokens via setTokenWhitelist()');
  console.log('3. Test SPOT trading flow');
  console.log('4. Test GMX trading flow');
  console.log('5. Update frontend to use V2 module');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });

