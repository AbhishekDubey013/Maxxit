#!/usr/bin/env ts-node
/**
 * Sync Ostium Markets to Database
 * Fetches all available markets from Ostium SDK and stores them in venue_markets table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncOstiumMarkets() {
  console.log('🔄 Syncing Ostium Markets from Service...\n');
  
  try {
    const ostiumServiceUrl = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';
    
    // Fetch markets from Ostium Python service
    const response = await fetch(`${ostiumServiceUrl}/available-markets?refresh=true`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.markets) {
      throw new Error('Invalid response from Ostium service');
    }
    
    console.log(`📊 Found ${data.count} markets from Ostium\n`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const [symbol, marketInfo] of Object.entries(data.markets as any)) {
      try {
        const marketData = {
          venue: 'OSTIUM' as const,
          token_symbol: symbol,
          market_name: marketInfo.name,
          market_index: marketInfo.index,
          is_active: marketInfo.available,
          last_synced: new Date(),
        };
        
        // Upsert (create or update)
        const result = await prisma.venue_markets.upsert({
          where: {
            venue_token_symbol: {
              venue: 'OSTIUM',
              token_symbol: symbol,
            },
          },
          update: {
            market_name: marketData.market_name,
            market_index: marketData.market_index,
            is_active: marketData.is_active,
            last_synced: marketData.last_synced,
          },
          create: marketData,
        });
        
        if (result.last_synced.getTime() === marketData.last_synced.getTime()) {
          created++;
        } else {
          updated++;
        }
        
        console.log(`  ✅ ${symbol} (Index: ${marketInfo.index}) - ${marketInfo.name}`);
      } catch (error: any) {
        console.error(`  ❌ ${symbol}: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Sync Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${data.count}`);
    console.log('═'.repeat(60));
    
    return { created, updated, errors, total: data.count };
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  syncOstiumMarkets()
    .then((result) => {
      console.log('\n✅ Ostium markets synced successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to sync Ostium markets:', error);
      process.exit(1);
    });
}

export { syncOstiumMarkets };

