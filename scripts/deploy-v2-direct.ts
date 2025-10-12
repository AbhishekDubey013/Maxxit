/**
 * Direct deployment of MaxxitTradingModuleV2 using ethers.js
 * No Hardhat needed!
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY;
const EXECUTOR_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const PLATFORM_FEE_RECEIVER = process.env.PLATFORM_FEE_RECEIVER;

async function compileContract() {
  console.log('📦 Compiling MaxxitTradingModuleV2...\n');

  const contractPath = path.join(__dirname, '../contracts/MaxxitTradingModuleV2.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  // Read OpenZeppelin dependencies
  const safeERC20Path = path.join(__dirname, '../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol');
  const ierc20Path = path.join(__dirname, '../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol');
  const addressPath = path.join(__dirname, '../node_modules/@openzeppelin/contracts/utils/Address.sol');
  const ierc20PermitPath = path.join(__dirname, '../node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol');

  const input = {
    language: 'Solidity',
    sources: {
      'MaxxitTradingModuleV2.sol': {
        content: contractSource,
      },
      '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol': {
        content: fs.readFileSync(safeERC20Path, 'utf8'),
      },
      '@openzeppelin/contracts/token/ERC20/IERC20.sol': {
        content: fs.readFileSync(ierc20Path, 'utf8'),
      },
      '@openzeppelin/contracts/utils/Address.sol': {
        content: fs.readFileSync(addressPath, 'utf8'),
      },
      '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol': {
        content: fs.readFileSync(ierc20PermitPath, 'utf8'),
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((err: any) => err.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach((err: any) => console.error(err.formattedMessage));
      throw new Error('Compilation failed');
    }
  }

  const contract = output.contracts['MaxxitTradingModuleV2.sol']['MaxxitTradingModuleV2'];
  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
}

async function main() {
  console.log('\n🚀 ═══════════════════════════════════════════════════════');
  console.log('   MAXXIT TRADING MODULE V2 - DIRECT DEPLOYMENT');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!DEPLOYER_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY or EXECUTOR_PRIVATE_KEY not set');
  }

  if (!EXECUTOR_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not set');
  }

  // Setup
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const executor = new ethers.Wallet(EXECUTOR_KEY, provider);
  
  const feeReceiver = PLATFORM_FEE_RECEIVER || executor.address;

  console.log('📋 Configuration:');
  console.log(`├─ Network: Arbitrum One (Chain ID: 42161)`);
  console.log(`├─ Deployer: ${deployer.address}`);
  console.log(`├─ Executor: ${executor.address}`);
  console.log(`├─ Fee Receiver: ${feeReceiver}`);
  
  const balance = await deployer.getBalance();
  console.log(`└─ Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.lt(ethers.utils.parseEther('0.0005'))) {
    throw new Error(`Insufficient balance for deployment (need at least 0.0005 ETH, have ${ethers.utils.formatEther(balance)} ETH)`);
  }
  
  if (balance.lt(ethers.utils.parseEther('0.001'))) {
    console.log(`⚠️  Low balance warning: You have ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   Deployment might fail if gas prices spike. Recommended: 0.001+ ETH\n`);
  }

  // Compile
  const { abi, bytecode } = await compileContract();
  console.log('✅ Compilation successful!\n');

  // Deploy
  console.log('⏳ Deploying contract to Arbitrum...\n');
  
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await factory.deploy(executor.address, feeReceiver, {
    gasLimit: 3000000, // Set explicit gas limit
  });

  console.log('⏳ Waiting for deployment transaction...');
  console.log(`   TX: ${contract.deployTransaction.hash}\n`);

  await contract.deployed();

  const receipt = await contract.deployTransaction.wait();

  console.log('✅ MaxxitTradingModuleV2 deployed successfully!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 DEPLOYMENT DETAILS:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Contract Address: ${contract.address}`);
  console.log(`Transaction Hash: ${contract.deployTransaction.hash}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Gas Price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')} gwei`);
  console.log(`Deployment Cost: ${ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))} ETH\n`);

  console.log(`🔍 View on Arbiscan: https://arbiscan.io/address/${contract.address}\n`);

  // Save deployment info
  const deployment = {
    address: contract.address,
    txHash: contract.deployTransaction.hash,
    deployer: deployer.address,
    executor: executor.address,
    feeReceiver: feeReceiver,
    timestamp: new Date().toISOString(),
    network: 'arbitrum',
    chainId: 42161,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };

  const deploymentPath = path.join(__dirname, '../deployment-v2.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`📄 Deployment info saved to: deployment-v2.json\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 USER ONBOARDING (SIMPLIFIED!):');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('OLD FLOW (4 steps):');
  console.log('  ❌ 1. Enable module');
  console.log('  ❌ 2. Approve USDC to module');
  console.log('  ❌ 3. Initialize capital');
  console.log('  ❌ 4. Authorize GMX subaccount');
  console.log('');
  console.log('NEW FLOW (2 steps!):');
  console.log('  ✅ 1. Enable module on Safe');
  console.log('  ✅ 2. Call completeSetup() → ALL DONE!');
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 STEP 1: ENABLE MODULE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('1. Go to https://app.safe.global');
  console.log('2. Select your Safe');
  console.log('3. Settings → Modules');
  console.log('4. Add Module:', contract.address);
  console.log('5. Sign and execute transaction\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 STEP 2: COMPLETE SETUP');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('1. Go to Safe Transaction Builder app');
  console.log('2. Enter contract interaction:');
  console.log(`   To: ${contract.address}`);
  console.log('   ABI: completeSetup()');
  console.log('   Value: 0');
  console.log('3. Sign and execute transaction');
  console.log('4. ✅ DONE! Start trading!\n');

  console.log('What completeSetup() does automatically:');
  console.log('  ✅ Approves USDC to module (for fees)');
  console.log('  ✅ Approves USDC to Uniswap (for swaps)');
  console.log('  ✅ Authorizes executor as GMX subaccount');
  console.log('  ✅ Initializes capital tracking\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔧 UPDATE ENV VARIABLES:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Update your .env file:');
  console.log(`MODULE_ADDRESS=${contract.address}\n`);
  console.log('Update Railway:');
  console.log(`  MODULE_ADDRESS=${contract.address}\n`);
  console.log('Update Vercel:');
  console.log(`  NEXT_PUBLIC_MODULE_ADDRESS=${contract.address}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TEST THE DEPLOYMENT:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('After user completes onboarding:');
  console.log('  npx tsx scripts/test-gmx-complete-flow.ts <SAFE_ADDRESS>\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  });

