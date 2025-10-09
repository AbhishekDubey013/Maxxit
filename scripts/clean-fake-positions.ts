import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const positions = await prisma.position.findMany({
    include: {
      signal: { select: { tokenSymbol: true, side: true } },
      deployment: { include: { agent: true } }
    },
    orderBy: { openedAt: 'desc' }
  });
  
  console.log('📊 All Positions in Database:\n');
  
  const realPositions: any[] = [];
  const fakePositions: any[] = [];
  
  positions.forEach(p => {
    const hasRealTxHash = p.openTxHash && p.openTxHash.startsWith('0x') && p.openTxHash.length === 66;
    const hasFakePrice = p.entryPrice && parseFloat(p.entryPrice) === 100;
    
    const info = {
      id: p.id,
      agent: p.deployment.agent.name,
      token: p.signal.tokenSymbol,
      side: p.signal.side,
      entryPrice: p.entryPrice,
      txHash: p.openTxHash?.substring(0, 20) + '...',
      closed: !!p.closedAt,
      fullTxHash: p.openTxHash
    };
    
    if (hasRealTxHash && !hasFakePrice) {
      realPositions.push(info);
    } else {
      fakePositions.push(info);
    }
  });
  
  console.log(`✅ REAL On-Chain Positions: ${realPositions.length}`);
  realPositions.forEach(p => {
    console.log(`   - ${p.agent}: ${p.token} ${p.side} @ $${p.entryPrice} | TX: ${p.txHash} | Closed: ${p.closed}`);
  });
  
  console.log(`\n❌ FAKE/Test Positions: ${fakePositions.length}`);
  fakePositions.forEach(p => {
    console.log(`   - [${p.id.substring(0, 8)}] ${p.agent}: ${p.token} ${p.side} @ $${p.entryPrice} | TX: ${p.txHash || 'none'}`);
  });
  
  // Delete fake positions
  if (fakePositions.length > 0) {
    console.log(`\n🗑️  Deleting ${fakePositions.length} fake positions...`);
    const fakeIds = fakePositions.map(p => p.id);
    
    const deleted = await prisma.position.deleteMany({
      where: { id: { in: fakeIds } }
    });
    
    console.log(`✅ Deleted ${deleted.count} fake positions`);
  } else {
    console.log('\n✅ No fake positions found - database is clean!');
  }
  
  await prisma.$disconnect();
})();

