import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SIGNAL_ID = 'ca7eddd6-fbf0-4e72-9c60-7b380424a126';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com';

async function executeTestSignal() {
  console.log('⚡ EXECUTING TEST SIGNAL\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Fetch signal with agent and deployment
    const signal = await prisma.signal.findUnique({
      where: { id: SIGNAL_ID },
      include: {
        agent: {
          include: { deployments: true }
        }
      }
    });
    
    if (!signal) {
      console.log('❌ Signal not found');
      return;
    }
    
    const deployment = signal.agent.deployments[0];
    
    if (!deployment) {
      console.log('❌ No deployment found for agent');
      return;
    }
    
    console.log('📊 SIGNAL DETAILS:\n');
    console.log('   Signal ID:', signal.id);
    console.log('   Agent:', signal.agent.name);
    console.log('   Action:', signal.side, signal.tokenSymbol);
    console.log('   Size: $' + (signal.sizeModel as any).amount + ' USD');
    console.log('   Venue:', signal.venue);
    console.log('');
    
    console.log('💰 SAFE WALLET:\n');
    console.log('   Address:', deployment.safeWallet);
    console.log('   Module Enabled:', deployment.moduleEnabled ? '✅ YES' : '❌ NO');
    console.log('');
    
    // Check if module is enabled on-chain
    if (!deployment.moduleEnabled) {
      console.log('❌ EXECUTION BLOCKED: Module not enabled');
      console.log('   User must enable the Safe Module first');
      return;
    }
    
    // Check Safe wallet USDC balance
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    const USDC_ABI = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const balance = await usdc.balanceOf(deployment.safeWallet);
    const balanceUSDC = parseFloat(ethers.utils.formatUnits(balance, 6));
    
    console.log('💵 USDC BALANCE:\n');
    console.log('   Balance:', balanceUSDC.toFixed(2), 'USDC');
    console.log('   Required:', (signal.sizeModel as any).amount + 0.2, 'USDC (including 0.2 fee)');
    console.log('');
    
    if (balanceUSDC < (signal.sizeModel as any).amount + 0.2) {
      console.log('❌ EXECUTION BLOCKED: Insufficient USDC balance');
      console.log('   Please deposit USDC to Safe wallet');
      return;
    }
    
    // Check if executor has private key
    if (!EXECUTOR_PRIVATE_KEY) {
      console.log('⚠️  EXECUTOR_PRIVATE_KEY not set in .env');
      console.log('   Cannot execute on-chain transactions');
      console.log('');
      console.log('✅ PRE-EXECUTION VALIDATION PASSED');
      console.log('   - Signal exists');
      console.log('   - Module enabled');
      console.log('   - Sufficient USDC balance');
      console.log('');
      console.log('🔧 To execute, set EXECUTOR_PRIVATE_KEY in .env and run again');
      return;
    }
    
    console.log('✅ ALL VALIDATIONS PASSED\n');
    console.log('🚀 EXECUTING TRADE...\n');
    
    // TODO: Implement actual trade execution via Safe Module
    // This would call the MaxxitTradingModule contract to execute the swap
    
    console.log('⚠️  TRADE EXECUTION NOT YET IMPLEMENTED');
    console.log('   This is a dry-run showing the flow would work');
    console.log('');
    console.log('📝 NEXT STEPS TO COMPLETE:');
    console.log('   1. Build Uniswap V3 swap transaction');
    console.log('   2. Call MaxxitTradingModule.executeTrade()');
    console.log('   3. Create Position record in database');
    console.log('   4. Deduct 0.2 USDC platform fee');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

executeTestSignal();


