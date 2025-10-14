import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ARBITRUM_RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const SAFE_ADDRESS = '0xe9ecbddb6308036f5470826a1fdfc734cfe866b1'; // Friend's Safe from error

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
  'function getModules() view returns (address[])',
];

async function main() {
  console.log('\n🔍 CHECKING MODULE STATUS MISMATCH\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Safe Address: ${SAFE_ADDRESS}`);
  console.log(`Module Address: ${MODULE_ADDRESS}\n`);

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const safeContract = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

  // 1. Check DATABASE status
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1️⃣  DATABASE STATUS\n');
  const deployment = await prisma.agentDeployment.findFirst({
    where: {
      safeWallet: {
        equals: SAFE_ADDRESS,
        mode: 'insensitive',
      },
    },
    include: {
      agent: true,
    },
  });

  if (!deployment) {
    console.log('❌ No deployment found in database for this Safe');
  } else {
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Deployment ID: ${deployment.id}`);
    console.log(`   Module Enabled (DB): ${deployment.moduleEnabled ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`   Module Address (DB): ${deployment.moduleAddress || 'NULL'}`);
  }

  // 2. Check ON-CHAIN status
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('2️⃣  ON-CHAIN STATUS\n');
  try {
    const isModuleEnabled = await safeContract.isModuleEnabled(MODULE_ADDRESS);
    console.log(`   Module Enabled (On-Chain): ${isModuleEnabled ? '✅ TRUE' : '❌ FALSE'}`);

    const modules = await safeContract.getModules();
    console.log(`\n   All Enabled Modules (${modules.length}):`);
    if (modules.length === 0) {
      console.log('     (none)');
    } else {
      modules.forEach((mod: string) => {
        const isMaxxit = mod.toLowerCase() === MODULE_ADDRESS.toLowerCase();
        console.log(`     - ${mod} ${isMaxxit ? '(Maxxit V2 Module)' : ''}`);
      });
    }

    // 3. Check for mismatch
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('3️⃣  DIAGNOSIS\n');
    
    if (deployment && deployment.moduleEnabled !== isModuleEnabled) {
      console.log('❌ MISMATCH DETECTED!');
      console.log(`   Database says: ${deployment.moduleEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   On-chain says: ${isModuleEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log('\n💡 Fixing database to match on-chain reality...\n');
      
      await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: {
          moduleEnabled: isModuleEnabled,
          moduleAddress: MODULE_ADDRESS, // Ensure correct module address
        },
      });
      
      console.log('✅ Database updated!');
      console.log(`   Module Enabled: ${deployment.moduleEnabled} → ${isModuleEnabled}`);
      console.log(`   Module Address: ${deployment.moduleAddress || 'NULL'} → ${MODULE_ADDRESS}`);
      
      if (!isModuleEnabled) {
        console.log('\n🔧 NEXT STEP FOR USER:');
        console.log('   User needs to enable the module on their Safe:');
        console.log(`   1. Go to: https://app.safe.global/home?safe=arb1:${SAFE_ADDRESS}`);
        console.log('   2. Settings → Modules → Add Module');
        console.log(`   3. Enter: ${MODULE_ADDRESS}`);
        console.log('   4. Confirm transaction');
        console.log('\n   Or use Safe Transaction Builder to call:');
        console.log('   enableModule(address module)');
        console.log(`   with parameter: ${MODULE_ADDRESS}`);
      }
    } else if (deployment && deployment.moduleEnabled === isModuleEnabled) {
      console.log('✅ Database and on-chain are IN SYNC');
      if (!isModuleEnabled) {
        console.log('\n🔧 NEXT STEP FOR USER:');
        console.log('   User needs to enable the module on their Safe first.');
      } else {
        console.log('   Module is correctly enabled!');
      }
    }

  } catch (error: any) {
    console.error('   Error checking on-chain status:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

