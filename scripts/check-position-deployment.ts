/**
 * Check open WETH positions and their deployment info
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking open WETH positions...\n');
  
  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: 'WETH',
      closedAt: null,
    },
    include: {
      deployment: {
        include: {
          agent: true,
        },
      },
    },
    orderBy: { openedAt: 'desc' },
    take: 5,
  });
  
  if (positions.length === 0) {
    console.log('No open WETH positions found.\n');
    return;
  }
  
  console.log(`Found ${positions.length} open WETH position(s):\n`);
  
  positions.forEach((p, i) => {
    console.log(`${i + 1}. Position ID: ${p.id}`);
    console.log(`   Token: ${p.tokenSymbol}`);
    console.log(`   Qty: ${p.qty}`);
    console.log(`   Agent: ${p.deployment.agent.name}`);
    console.log(`   Safe: ${p.deployment.safeWallet}`);
    console.log(`   Module Address: ${p.deployment.moduleAddress || '❌ NULL'}`);
    console.log(`   Module Enabled: ${p.deployment.moduleEnabled ? '✅' : '❌'}`);
    console.log(`   Opened: ${p.openedAt}\n`);
  });
  
  const nullModules = positions.filter(p => !p.deployment.moduleAddress);
  if (nullModules.length > 0) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`❌ ${nullModules.length} position(s) have NULL moduleAddress!`);
    console.log('   This will cause closing to fail.\n');
    console.log('   Need to update deployment.moduleAddress to:');
    console.log('   0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

