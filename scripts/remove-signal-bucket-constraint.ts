#!/usr/bin/env tsx
/**
 * Remove the 6h bucket unique constraint from signals table
 * This constraint prevents instant manual Telegram trades
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeConstraint() {
  console.log('🔧 REMOVING SIGNAL 6H BUCKET CONSTRAINT');
  console.log('═'.repeat(70));
  console.log('');
  
  try {
    console.log('1️⃣ Checking for constraint...');
    
    // Check for unique constraints on signals table
    const constraints = await prisma.$queryRaw<any[]>`
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'signals'::regclass
        AND contype = 'u'
    `;
    
    console.log('Found constraints:', constraints.length);
    constraints.forEach(c => {
      console.log('  -', c.constraint_name, ':', c.definition);
    });
    console.log('');
    
    // Check for unique indexes
    console.log('2️⃣ Checking for unique indexes...');
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'signals'
        AND indexdef LIKE '%UNIQUE%'
    `;
    
    console.log('Found unique indexes:', indexes.length);
    indexes.forEach(idx => {
      console.log('  -', idx.indexname);
      console.log('    ', idx.indexdef);
    });
    console.log('');
    
    // Look for any index mentioning bucket
    const bucketIndexes = await prisma.$queryRaw<any[]>`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'signals'
        AND (indexdef LIKE '%bucket%' OR indexname LIKE '%bucket%')
    `;
    
    if (bucketIndexes.length > 0) {
      console.log('3️⃣ Found bucket-related indexes:');
      bucketIndexes.forEach(idx => {
        console.log('  -', idx.indexname);
      });
      console.log('');
      
      console.log('⚠️  To remove, run:');
      bucketIndexes.forEach(idx => {
        console.log(`   DROP INDEX IF EXISTS ${idx.indexname};`);
      });
    } else {
      console.log('3️⃣ No bucket-related indexes found');
      console.log('');
      console.log('The constraint might be defined differently.');
      console.log('Checking all indexes on signals table...');
      console.log('');
      
      const allIndexes = await prisma.$queryRaw<any[]>`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'signals'
      `;
      
      console.log('All indexes on signals:');
      allIndexes.forEach(idx => {
        console.log('  -', idx.indexname);
        console.log('    ', idx.indexdef);
      });
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('');
    console.log('⚠️  This script only SHOWS constraints.');
    console.log('   To actually remove them, you need database admin access.');
    console.log('');
    console.log('Options:');
    console.log('1. Run DROP commands manually in database');
    console.log('2. Create a Prisma migration to remove constraint');
    console.log('3. For quick fix: Use different agentId for manual trades');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeConstraint();

