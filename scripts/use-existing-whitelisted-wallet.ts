#!/usr/bin/env tsx

/**
 * Use existing whitelisted wallet for testing
 * Updates user_hyperliquid_wallets to use a previously whitelisted address
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = Buffer.from(
  process.env.AGENT_WALLET_ENCRYPTION_KEY || '',
  'hex'
);

async function useExistingWallet() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Use Existing Whitelisted Wallet                            ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const userWallet = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
  const agentAddress = '0x962Fb86a7A08a1DD694d5ABfEc0424980b7ec382';
  const privateKey = '0x8c2fe82215733e0def699bebfa7db62b0a80677b86983d3e4be0a7da3fc72e0f';

  console.log(`Setting up:`);
  console.log(`  User: ${userWallet}`);
  console.log(`  Agent Address: ${agentAddress}`);
  console.log(`  Status: Already whitelisted on Hyperliquid testnet ✅\n`);

  // Encrypt private key
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Check if user already has a wallet
  const existing = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: userWallet.toLowerCase() }
  });

  if (existing) {
    console.log('Updating existing wallet entry...');
    await prisma.user_hyperliquid_wallets.update({
      where: { user_wallet: userWallet.toLowerCase() },
      data: {
        agent_address: agentAddress,
        agent_private_key_encrypted: encrypted,
        agent_key_iv: iv.toString('hex'),
        agent_key_tag: authTag.toString('hex'),
      }
    });
  } else {
    console.log('Creating new wallet entry...');
    await prisma.user_hyperliquid_wallets.create({
      data: {
        user_wallet: userWallet.toLowerCase(),
        agent_address: agentAddress,
        agent_private_key_encrypted: encrypted,
        agent_key_iv: iv.toString('hex'),
        agent_key_tag: authTag.toString('hex'),
      }
    });
  }

  console.log('✅ Wallet configured!\n');
  console.log('Now you can run the test and it will use this whitelisted address:');
  console.log('  npx tsx scripts/test-complete-automated-flow.ts\n');

  await prisma.$disconnect();
}

useExistingWallet().catch(console.error);

