import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Top SPOT tokens on Arbitrum (matching whitelist)
const TOKENS = [
  { symbol: 'WETH', address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
  { symbol: 'USDC', address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
  { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
  { symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
  { symbol: 'AAVE', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' },
  { symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978' },
  { symbol: 'MKR', address: '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879' },
  { symbol: 'SNX', address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60' },
  { symbol: 'BAL', address: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8' },
  { symbol: 'COMP', address: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE' },
  { symbol: 'YFI', address: '0x82e3A8F066a6989666b031d916c43672085b1582' },
  { symbol: 'SUSHI', address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A' },
  { symbol: 'GRT', address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7' },
  { symbol: 'LDO', address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60' },
  { symbol: 'PENDLE', address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8' },
];

async function addTokensToVenueStatus() {
  console.log('\n📊 Adding tokens to venueStatus table\n');
  console.log('═'.repeat(60));

  for (const token of TOKENS) {
    try {
      // Check if exists
      const existing = await prisma.venueStatus.findFirst({
        where: {
          venue: 'SPOT',
          tokenSymbol: token.symbol,
        },
      });

      if (existing) {
        console.log(`   ${token.symbol}: ✅ Already in DB`);
        continue;
      }

      // Create
      await prisma.venueStatus.create({
        data: {
          venue: 'SPOT',
          tokenSymbol: token.symbol,
        },
      });

      console.log(`   ${token.symbol}: ✅ Added to DB`);
    } catch (error: any) {
      console.error(`   ${token.symbol}: ❌ Failed - ${error.message}`);
    }
  }

  // Also add to tokenRegistry
  console.log(`\n📊 Adding tokens to tokenRegistry table\n`);

  for (const token of TOKENS) {
    try {
      const existing = await prisma.tokenRegistry.findUnique({
        where: {
          tokenSymbol: token.symbol,
        },
      });

      if (existing) {
        console.log(`   ${token.symbol}: ✅ Already in registry`);
        continue;
      }

      await prisma.tokenRegistry.create({
        data: {
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          chainId: 42161,
        },
      });

      console.log(`   ${token.symbol}: ✅ Added to registry`);
    } catch (error: any) {
      console.error(`   ${token.symbol}: ❌ Failed - ${error.message}`);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('\n✅ Done! All tokens ready for SPOT trading.\n');

  await prisma.$disconnect();
}

addTokensToVenueStatus().catch(console.error);

