/**
 * Initialize Capital - Required before first trade
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const MODULE_ABI = [
  'function initializeCapital(address safe) external',
  'function safeCapital(address safe) view returns (uint256)',
  'function authorizedExecutors(address) view returns (bool)',
  'function owner() view returns (address)',
];

async function initializeCapital() {
  console.log('🚀 Initialize Capital for Safe');
  console.log('━'.repeat(60));
  
  try {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key found in .env');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);

    console.log(`📍 Safe: ${SAFE_ADDRESS}`);
    console.log(`🔧 Module: ${MODULE_ADDRESS}`);
    console.log(`🔑 Caller: ${wallet.address}`);
    console.log('');

    // Check if caller is authorized
    console.log('1️⃣  CHECKING AUTHORIZATION:');
    console.log('━'.repeat(60));
    
    const moduleOwner = await module.owner();
    console.log(`Module Owner: ${moduleOwner}`);
    
    const isAuthorized = await module.authorizedExecutors(wallet.address);
    console.log(`Is Authorized: ${isAuthorized ? '✅ YES' : '❌ NO'}`);
    
    if (!isAuthorized) {
      console.log('');
      console.log('⚠️  You are not an authorized executor!');
      console.log('');
      if (wallet.address.toLowerCase() === moduleOwner.toLowerCase()) {
        console.log('💡 You are the module owner. You should be auto-authorized.');
        console.log('   Trying to initialize anyway...');
      } else {
        console.log(`❌ Only the module owner (${moduleOwner}) can authorize executors.`);
        return;
      }
    }
    
    // Check current capital
    console.log('');
    console.log('2️⃣  CHECKING CURRENT CAPITAL:');
    console.log('━'.repeat(60));
    
    const currentCapital = await module.safeCapital(SAFE_ADDRESS);
    console.log(`Current Capital: ${ethers.utils.formatUnits(currentCapital, 6)} USDC`);
    
    if (currentCapital.gt(0)) {
      console.log('✅ Capital already initialized!');
      console.log('   Your Safe is ready to trade.');
      return;
    }
    
    console.log('❌ Capital not initialized yet.');
    console.log('');
    console.log('3️⃣  INITIALIZING CAPITAL:');
    console.log('━'.repeat(60));
    
    const tx = await module.initializeCapital(SAFE_ADDRESS, {
      gasLimit: 200000
    });
    
    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log(`🔗 https://arbiscan.io/tx/${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await tx.wait();
    
    console.log('✅ Capital initialized!');
    console.log('');
    
    // Check new capital
    const newCapital = await module.safeCapital(SAFE_ADDRESS);
    console.log(`📊 Initialized Capital: ${ethers.utils.formatUnits(newCapital, 6)} USDC`);
    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ SETUP COMPLETE! Ready to trade.');
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('Unauthorized executor')) {
      console.log('');
      console.log('💡 You need to be authorized by the module owner first.');
    } else if (error.message.includes('Capital already initialized')) {
      console.log('');
      console.log('✅ Capital is already initialized. You can proceed with trading.');
    }
  }
}

initializeCapital().catch(console.error);

