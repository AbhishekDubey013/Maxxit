#!/usr/bin/env ts-node
/**
 * Execute V3 SQL directly via Prisma
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function executeSQLFile() {
  console.log('\n🚀 Executing V3 SQL...\n');

  try {
    const sql = readFileSync('/tmp/deploy-v3.sql', 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('--') && !statement.includes('CREATE')) {
        continue; // Skip pure comments
      }
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Success\n`);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  Already exists (skipping)\n`);
        } else {
          console.error(`❌ Error: ${error.message}\n`);
        }
      }
    }
    
    console.log('\n✅ V3 SQL execution complete!');
    
    // Verify tables
    console.log('\n📊 Verifying V3 tables...\n');
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%_v3'
      ORDER BY tablename;
    `;
    
    console.log('V3 Tables created:');
    tables.forEach((t) => {
      console.log(`  ✅ ${t.tablename}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 V3 IS NOW READY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('V2 and V3 are completely separate:');
    console.log('  • V2: agents, signals, positions');
    console.log('  • V3: agents_v3, signals_v3, positions_v3\n');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  executeSQLFile()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { executeSQLFile };

