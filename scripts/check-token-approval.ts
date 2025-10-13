import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all SPOT tokens from VenueStatus
  const venueTokens = await prisma.venueStatus.findMany({
    where: { venue: 'SPOT' },
  });

  // Get all Arbitrum tokens from TokenRegistry
  const registryTokens = await prisma.tokenRegistry.findMany({
    where: { chain: 'arbitrum' },
  });

  const venueSet = new Set(venueTokens.map(v => v.tokenSymbol));
  const registrySet = new Set(registryTokens.map(r => r.tokenSymbol));

  const missing = Array.from(venueSet).filter(t => !registrySet.has(t));

  console.log('\n🔍 Token Approval Status:\n');
  console.log('════════════════════════════════════════');
  console.log('VenueStatus (whitelisted):  ', venueTokens.length, 'tokens');
  console.log('TokenRegistry (addresses):  ', registryTokens.length, 'tokens');
  console.log('');

  console.log('✅ Tokens with Addresses (' + registryTokens.length + '):');
  console.log('════════════════════════════════════════');
  registryTokens.forEach(t => {
    console.log('  • ' + t.tokenSymbol);
  });
  console.log('');

  console.log('❌ Missing Addresses (' + missing.length + ' tokens):');
  console.log('════════════════════════════════════════');
  if (missing.length > 0) {
    missing.forEach(t => console.log('  • ' + t));
    console.log('');
    console.log('⚠️  These tokens will FAIL to trade!');
    console.log('They need addresses added to TokenRegistry.');
  } else {
    console.log('✅ None - All tokens have addresses!');
  }
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

