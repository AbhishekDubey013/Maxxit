/**
 * Watch Railway Automation
 * Monitors database for signal generation activity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function watchAutomation() {
  console.log('👁️  Watching Railway Automation');
  console.log('   Press Ctrl+C to stop\n');
  console.log('━'.repeat(60));
  
  let lastSignalCount = 0;
  let lastTweetClassified = false;
  
  setInterval(async () => {
    const now = new Date().toISOString().split('T')[1].split('.')[0];
    
    // Check total signals
    const signalCount = await prisma.signal.count();
    
    // Check if our specific tweet got classified
    const tweet = await prisma.ctPost.findFirst({
      where: { tweetId: '1983570813531082852' }
    });
    
    const isClassified = tweet?.isSignalCandidate || false;
    
    // Report changes
    if (signalCount !== lastSignalCount) {
      console.log(`\n[${now}] 📊 NEW SIGNAL! Total signals: ${signalCount} (+${signalCount - lastSignalCount})`);
      
      // Show the new signal
      const newSignals = await prisma.signal.findMany({
        orderBy: { createdAt: 'desc' },
        take: signalCount - lastSignalCount,
        include: { agent: true }
      });
      
      newSignals.forEach(sig => {
        console.log(`         ✅ ${sig.side} ${sig.tokenSymbol} for ${sig.agent.name}`);
      });
      
      lastSignalCount = signalCount;
    }
    
    if (isClassified && !lastTweetClassified) {
      console.log(`\n[${now}] 🧠 TWEET CLASSIFIED!`);
      console.log(`         Text: "${tweet?.tweetText}"`);
      console.log(`         Tokens: ${tweet?.extractedTokens}`);
      lastTweetClassified = true;
    }
    
    // Heartbeat
    process.stdout.write(`\r[${now}] Monitoring... (Signals: ${signalCount}, Tweet classified: ${isClassified ? 'Yes' : 'No'})`);
    
  }, 10000); // Check every 10 seconds
}

watchAutomation().catch(console.error);

