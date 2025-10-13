import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test a few tokens that should work
  const testTokens = ['LINK', 'UNI', 'SNX', 'PEPE', 'DAI', 'GRT'];

  console.log('\n🔍 Sample Token Check:\n');
  console.log('Token    Address           Whitelisted  Ready');
  console.log('═════════════════════════════════════════════════');

  for (const symbol of testTokens) {
    const registry = await prisma.tokenRegistry.findUnique({
      where: {
        chain_tokenSymbol: {
          chain: 'arbitrum',
          tokenSymbol: symbol,
        },
      },
    });

    const venue = await prisma.venueStatus.findFirst({
      where: {
        venue: 'SPOT',
        tokenSymbol: symbol,
      },
    });

    const hasAddress = !!registry?.tokenAddress;
    const whitelisted = !!venue;
    const ready = hasAddress && whitelisted;
    const status = ready ? '✅' : '❌';

    console.log(
      `${status} ${symbol.padEnd(6)} ${
        (registry?.tokenAddress?.slice(0, 12) + '...' || 'MISSING').padEnd(18)
      } ${whitelisted ? 'YES' : 'NO '}        ${ready ? 'YES' : 'NO '}`
    );
  }

  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

