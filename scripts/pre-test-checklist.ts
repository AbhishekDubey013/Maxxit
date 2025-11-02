#!/usr/bin/env tsx

/**
 * Pre-Test Checklist
 * Verifies all prerequisites before running the complete flow test
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function runChecklist() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Pre-Test Checklist                                          ║');
  console.log('║   Verify all prerequisites before testing                     ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let allGood = true;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Environment Variables
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Environment Variables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const requiredEnvVars = [
    { key: 'DATABASE_URL', description: 'Database connection string' },
    { key: 'LUNARCRUSH_API_KEY', description: 'LunarCrush API key for scoring' },
    { key: 'AGENT_WALLET_ENCRYPTION_KEY', description: '32-byte hex encryption key' },
    { key: 'HYPERLIQUID_SERVICE_URL', description: 'Hyperliquid Python service URL' },
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.key];
    if (value) {
      const preview = value.length > 40 ? value.substring(0, 40) + '...' : value;
      console.log(`✅ ${envVar.key}: ${preview}`);
    } else {
      console.log(`❌ ${envVar.key}: MISSING (${envVar.description})`);
      allGood = false;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Database Schema
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  2. Database Schema');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if user_hyperliquid_wallets table exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_hyperliquid_wallets'
      );
    ` as any[];
    
    if (result[0].exists) {
      console.log('✅ user_hyperliquid_wallets table exists');
    } else {
      console.log('❌ user_hyperliquid_wallets table MISSING');
      console.log('   Run: npx prisma db push');
      allGood = false;
    }

    // Check ct_posts fields
    const ctPostsFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ct_posts';
    ` as any[];

    const fieldNames = ctPostsFields.map((f: any) => f.column_name);
    const requiredFields = ['confidence_score', 'signal_type', 'processed_for_signals'];
    
    for (const field of requiredFields) {
      if (fieldNames.includes(field)) {
        console.log(`✅ ct_posts.${field} exists`);
      } else {
        console.log(`❌ ct_posts.${field} MISSING`);
        console.log('   Run: npx prisma db push');
        allGood = false;
      }
    }

  } catch (error: any) {
    console.log(`❌ Database check failed: ${error.message}`);
    allGood = false;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Agent Existence
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  3. Agent Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agents = await prisma.agents.findMany({
    where: { venue: 'HYPERLIQUID' }
  });

  if (agents.length > 0) {
    console.log(`✅ Found ${agents.length} Hyperliquid agent(s):`);
    for (const agent of agents) {
      console.log(`   - ${agent.name} (${agent.id})`);
    }
  } else {
    console.log('⚠️  No Hyperliquid agents found');
    console.log('   Create one via the UI or database');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Hyperliquid Service
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  4. Hyperliquid Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const hlServiceUrl = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5000';
  console.log(`Service URL: ${hlServiceUrl}`);

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${hlServiceUrl}/health`, { timeout: 5000 });
    console.log(`✅ Hyperliquid service is running`);
    console.log(`   Status: ${response.status}`);
  } catch (error: any) {
    console.log(`❌ Hyperliquid service not reachable`);
    console.log(`   Error: ${error.message}`);
    console.log('   Start with: python services/hyperliquid-service/main.py');
    allGood = false;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. LunarCrush API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  5. LunarCrush API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (process.env.LUNARCRUSH_API_KEY) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get('https://lunarcrush.com/api4/public/coins/list/v1', {
        params: { key: process.env.LUNARCRUSH_API_KEY },
        timeout: 10000
      });
      console.log(`✅ LunarCrush API is working`);
      console.log(`   Coins available: ${response.data.data?.length || 0}`);
    } catch (error: any) {
      console.log(`❌ LunarCrush API error: ${error.message}`);
      allGood = false;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allGood) {
    console.log('  ✅ ALL CHECKS PASSED - Ready to test!');
  } else {
    console.log('  ❌ SOME CHECKS FAILED - Fix issues above');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (allGood) {
    console.log('Next step:');
    console.log('  npx tsx scripts/test-complete-automated-flow.ts\n');
  } else {
    console.log('Fix the issues above and run this checklist again.\n');
  }

  await prisma.$disconnect();
  process.exit(allGood ? 0 : 1);
}

runChecklist().catch(console.error);

