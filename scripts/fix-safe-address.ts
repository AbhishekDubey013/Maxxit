/**
 * Fix the Safe address in the deployment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deploymentId = '35c4f2d1-318c-420a-b3b0-abbd8bf847ff';
  const correctSafeAddress = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
  const correctModuleAddress = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';

  console.log('🔧 Fixing Safe address in deployment...\n');

  const updated = await prisma.agentDeployment.update({
    where: { id: deploymentId },
    data: {
      safeWallet: correctSafeAddress,
      moduleAddress: correctModuleAddress, // Also ensure module address is set
    },
    include: {
      agent: true,
    },
  });

  console.log('✅ Updated successfully!');
  console.log('   Agent:', updated.agent.name);
  console.log('   Old Safe: 0xE9ECBddB6308036f5470826A1fdfc734cFE866b1');
  console.log('   New Safe:', updated.safeWallet);
  console.log('   Module:', updated.moduleAddress);
  console.log('');
  console.log('🚀 Trades should work now!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

