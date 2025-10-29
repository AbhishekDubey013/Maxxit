import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CT_ACCOUNT_ID = '87912b96-9b9e-4544-a7c9-e3c5c7800b3c'; // @Abhishe42402615

async function injectTweet() {
  const tweetText = process.argv[2];
  
  if (!tweetText) {
    console.log('❌ Please provide tweet text as argument');
    console.log('\nUsage: npx tsx scripts/inject-test-tweet.ts "$ARB looking bullish! Breaking ATH soon 🚀"');
    process.exit(1);
  }

  try {
    console.log('📝 Injecting test tweet...\n');
    console.log(`Text: ${tweetText}\n`);

    const tweet = await prisma.ctPost.create({
      data: {
        ctAccountId: CT_ACCOUNT_ID,
        tweetId: `test_${Date.now()}`,
        tweetText: tweetText,
        tweetCreatedAt: new Date(),
        isSignalCandidate: false,
        extractedTokens: [],
      },
    });

    console.log('✅ Tweet injected successfully!');
    console.log(`   ID: ${tweet.id}`);
    console.log(`   Tweet ID: ${tweet.tweetId}`);
    console.log(`   Created at: ${tweet.tweetCreatedAt}`);

    console.log('\n💡 Next steps:');
    console.log('   1. Run signal generation: curl -X GET https://maxxit1.vercel.app/api/admin/generate-signals');
    console.log('   2. Run trade execution: curl -X GET https://maxxit1.vercel.app/api/admin/execute-trade');
    console.log('   3. Monitor: npx tsx scripts/monitor-tweet-to-trade.ts');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

injectTweet();

