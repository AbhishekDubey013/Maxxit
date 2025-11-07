/**
 * Test decryption of actual data from database
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY;

function decryptPrivateKey(encrypted: string, iv: string, tag: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('AGENT_WALLET_ENCRYPTION_KEY not set');
  }

  console.log('Decryption inputs:');
  console.log(`  Encrypted length: ${encrypted.length}`);
  console.log(`  IV length: ${iv.length}`);
  console.log(`  Tag length: ${tag.length}`);
  console.log(`  Key length: ${ENCRYPTION_KEY.length}`);

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function testActualDecryption() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           TEST ACTUAL DATABASE DECRYPTION                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get data from user_hyperliquid_wallets
    const wallets = await prisma.user_hyperliquid_wallets.findMany();
    const userWallet = wallets.find(w => w.agent_private_key_encrypted !== null);

    if (!userWallet) {
      console.error('❌ No encrypted wallet found in database');
      return;
    }

    console.log('✅ Found encrypted wallet in database');
    console.log(`   User: ${userWallet.user_wallet}`);
    console.log(`   Agent: ${userWallet.agent_address}\n`);

    console.log('Attempting decryption...\n');

    const decrypted = decryptPrivateKey(
      userWallet.agent_private_key_encrypted!,
      userWallet.agent_key_iv!,
      userWallet.agent_key_tag!
    );

    console.log('✅ DECRYPTION SUCCESSFUL!');
    console.log(`   Decrypted key: ${decrypted.substring(0, 20)}...\n`);

    // Verify it's a valid private key format
    if (decrypted.startsWith('0x') && decrypted.length === 66) {
      console.log('✅ Valid private key format\n');
    } else {
      console.log('⚠️  Unexpected format:', decrypted.substring(0, 50));
    }

  } catch (error: any) {
    console.error('\n❌ DECRYPTION FAILED');
    console.error('Error:', error.message);
    console.error('\nThis means the encryption key used to encrypt does not match');
    console.error('the key being used to decrypt.\n');
    
    // Show current key for comparison
    console.error(`Current ENCRYPTION_KEY: ${ENCRYPTION_KEY}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

testActualDecryption();

