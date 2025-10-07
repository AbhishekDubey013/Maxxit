import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SIGNAL_ID = process.argv[2];
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com';

async function executeSignal() {
  if (!SIGNAL_ID) {
    console.log('❌ Usage: npx tsx scripts/execute-signal.ts <SIGNAL_ID>');
    return;
  }
  
  console.log('⚡ EXECUTING SIGNAL:', SIGNAL_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
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
    console.log('   Agent:', signal.agent.name);
    console.log('   Action:', signal.side, signal.tokenSymbol);
    console.log('   Size: $' + (signal.sizeModel as any).amount + ' USD');
    console.log('   Fee: $0.20 USDC');
    console.log('   Total: $' + ((signal.sizeModel as any).amount + 0.2) + ' USDC');
    console.log('');
    
    console.log('💰 SAFE WALLET:\n');
    console.log('   Address:', deployment.safeWallet);
    console.log('   Module Enabled:', deployment.moduleEnabled ? '✅ YES' : '❌ NO');
    console.log('');
    
    if (!deployment.moduleEnabled) {
      console.log('❌ EXECUTION BLOCKED: Module not enabled');
      return;
    }
    
    // Check USDC balance
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    const USDC_ABI = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const balance = await usdc.balanceOf(deployment.safeWallet);
    const balanceUSDC = parseFloat(ethers.utils.formatUnits(balance, 6));
    const required = (signal.sizeModel as any).amount + 0.2;
    
    console.log('💵 BALANCE CHECK:\n');
    console.log('   Available:', balanceUSDC.toFixed(2), 'USDC');
    console.log('   Required:', required.toFixed(2), 'USDC');
    console.log('   Status:', balanceUSDC >= required ? '✅ SUFFICIENT' : '❌ INSUFFICIENT');
    console.log('');
    
    if (balanceUSDC < required) {
      console.log('❌ EXECUTION BLOCKED: Insufficient USDC');
      console.log('   Need', (required - balanceUSDC).toFixed(2), 'more USDC');
      return;
    }
    
    // Check for existing position
    const existingPosition = await prisma.position.findFirst({
      where: { signalId: signal.id }
    });
    
    if (existingPosition) {
      console.log('⚠️  EXECUTION BLOCKED: Position already exists');
      console.log('   Position ID:', existingPosition.id);
      return;
    }
    
    console.log('✅ ALL VALIDATIONS PASSED\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!EXECUTOR_PRIVATE_KEY) {
      console.log('⚠️  DRY-RUN MODE (No EXECUTOR_PRIVATE_KEY)\n');
      console.log('✅ Signal is ready for execution');
      console.log('   All validations passed');
      console.log('   Would execute: USDC → ' + signal.tokenSymbol);
      console.log('   Would deduct: $0.20 USDC fee');
      console.log('   Would create: Position record');
      console.log('');
      console.log('🔧 To actually execute:');
      console.log('   1. Set EXECUTOR_PRIVATE_KEY in .env');
      console.log('   2. Implement Uniswap V3 swap logic');
      console.log('   3. Call MaxxitTradingModule.executeTrade()');
      return;
    }
    
    console.log('🚀 EXECUTING TRADE...\n');
    console.log('⚠️  TRADE EXECUTION NOT YET IMPLEMENTED\n');
    console.log('📝 TODO:');
    console.log('   1. Build Uniswap V3 swap calldata');
    console.log('   2. Encode executeTrade() call');
    console.log('   3. Execute via Safe Module');
    console.log('   4. Create Position record');
    console.log('   5. Deduct platform fee');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

executeSignal();


