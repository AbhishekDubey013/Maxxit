import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAgent() {
  const deployment = await prisma.agentDeployment.findFirst({
    where: {
      userWallet: {
        equals: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20',
        mode: 'insensitive',
      },
    },
    include: {
      agent: true,
    },
  });

  console.log('Agent Data:', JSON.stringify(deployment?.agent, null, 2));
  
  await prisma.$disconnect();
}

checkAgent();

