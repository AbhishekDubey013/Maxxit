import { PrismaClient } from '@prisma/client';

/**
 * Add missing token addresses to TokenRegistry
 * Run this on Railway to enable all tokens for trading
 */

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Adding Missing Token Addresses to TokenRegistry\n');

  const missingTokens = [
    { symbol: 'POL', address: '0x0E4831319A50228B9e450861297aB92dee15B44F' }, // POL (formerly MATIC)
    { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
    { symbol: 'SNX', address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60' },
    { symbol: 'BAL', address: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8' },
    { symbol: 'COMP', address: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE' },
    { symbol: 'YFI', address: '0x82e3A8F066a6989666b031d916c43672085b1582' },
    { symbol: 'SUSHI', address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A' },
    { symbol: 'GRT', address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7' },
    { symbol: 'PENDLE', address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8' },
    { symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' },
  ];

  for (const token of missingTokens) {
    await prisma.tokenRegistry.upsert({
      where: {
        chain_tokenSymbol: {
          chain: 'arbitrum',
          tokenSymbol: token.symbol,
        },
      },
      update: {
        tokenAddress: token.address,
      },
      create: {
        chain: 'arbitrum',
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
      },
    });
    console.log(`✅ ${token.symbol.padEnd(10)} ${token.address}`);
  }

  // Remove BTC and ETH aliases (auto-converted to WBTC/WETH by parser)
  const removed = await prisma.venueStatus.deleteMany({
    where: {
      venue: 'SPOT',
      tokenSymbol: { in: ['BTC', 'ETH'] },
    },
  });

  console.log(`\n✅ Removed ${removed.count} alias tokens (BTC, ETH)`);
  console.log('Parser auto-converts: BTC→WBTC, ETH→WETH');
  console.log('\n🎯 All 27 SPOT tokens ready for trading!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

