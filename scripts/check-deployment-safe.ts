/**
 * Check which Safe address is stored in the deployment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deploymentId = '35c4f2d1-318c-420a-b3b0-abbd8bf847ff'; // From error logs

  const deployment = await prisma.agentDeployment.findUnique({
    where: { id: deploymentId },
    include: {
      agent: true,
    },
  });

  if (!deployment) {
    console.log('❌ Deployment not found');
    return;
  }

  console.log('📊 Deployment Info:');
  console.log('   ID:', deployment.id);
  console.log('   Agent:', deployment.agent.name);
  console.log('   User Wallet:', deployment.userWallet);
  console.log('   Safe Wallet:', deployment.safeWallet);
  console.log('   Module Address:', deployment.moduleAddress);
  console.log('   Module Enabled:', deployment.moduleEnabled);
  console.log('');

  console.log('🔍 Comparison:');
  console.log('   Stored Safe:  ', deployment.safeWallet);
  console.log('   Correct Safe: ', '0x9A85f7140776477F1A79Ea29b7A32495636f5e20');
  console.log('');

  if (deployment.safeWallet.toLowerCase() !== '0x9A85f7140776477F1A79Ea29b7A32495636f5e20'.toLowerCase()) {
    console.log('❌ MISMATCH! Database has wrong Safe address.');
    console.log('');
    console.log('To fix, run:');
    console.log(`UPDATE agent_deployments SET safe_wallet = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20' WHERE id = '${deploymentId}';`);
  } else {
    console.log('✅ Safe address is correct');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

