import { PrismaClient } from '@prisma/client';
import { getTokenPriceUSD } from '../lib/price-oracle';

const prisma = new PrismaClient();

async function testMonitor() {
  try {
    // Get the ARB position
    const position = await prisma.position.findFirst({
      where: {
        tokenSymbol: 'ARB',
        closedAt: null,
      },
      include: {
        signal: true,
        deployment: {
          include: {
            agent: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    if (!position) {
      console.log('❌ No open ARB position found');
      return;
    }

    console.log('📊 Testing Position Monitor\n');
    console.log('━'.repeat(60));
    console.log('\n📍 Position Details:');
    console.log(`   ID: ${position.id}`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Side: ${position.side}`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Qty: ${position.qty}`);
    console.log(`   Opened: ${position.openedAt}`);
    console.log(`   TX: ${position.entryTxHash}`);

    console.log('\n🔍 Testing Price Fetch...');
    const price = await getTokenPriceUSD('ARB');
    
    if (price) {
      console.log(`✅ Current ARB Price: $${price.toFixed(4)}`);
      
      const entryPrice = parseFloat(position.entryPrice?.toString() || '0');
      if (entryPrice > 0) {
        const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
        console.log(`   Entry: $${entryPrice.toFixed(4)}`);
        console.log(`   P&L: ${pnlPercent.toFixed(2)}%`);
      }
      
      console.log('\n📋 Exit Conditions:');
      console.log(`   Trailing Stop: ${position.trailingParams?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Trailing %: ${position.trailingParams?.trailingPercent || 1}%`);
      console.log(`   Activation: Need +3% profit first`);
      console.log(`   Stop Loss: ${position.stopLoss || 'Not set'}`);
      console.log(`   Take Profit: ${position.takeProfit || 'Not set'}`);
      
    } else {
      console.log('❌ Failed to get ARB price');
      
      // Check token registry
      const token = await prisma.tokenRegistry.findFirst({
        where: { tokenSymbol: 'ARB', chain: 'ARBITRUM' },
      });
      
      if (token) {
        console.log('✅ ARB found in registry:');
        console.log(`   Address: ${token.tokenAddress}`);
        console.log(`   Router: ${token.preferredRouter}`);
      } else {
        console.log('❌ ARB NOT in token registry');
      }
    }

    console.log('\n━'.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMonitor();

