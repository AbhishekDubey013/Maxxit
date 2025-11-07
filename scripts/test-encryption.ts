/**
 * Test encryption/decryption with current key
 */

import 'dotenv/config';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌ AGENT_WALLET_ENCRYPTION_KEY not set');
  process.exit(1);
}

const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

function encryptPrivateKey(privateKey: string): { encrypted: string; iv: string; tag: string } {
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

function decryptPrivateKey(encrypted: string, iv: string, tag: string): string {
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                 TEST ENCRYPTION/DECRYPTION                    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log(`Encryption key length: ${ENCRYPTION_KEY.length} characters`);
console.log(`Original private key: ${testPrivateKey}\n`);

try {
  // Encrypt
  const { encrypted, iv, tag } = encryptPrivateKey(testPrivateKey);
  console.log('✅ Encryption successful');
  console.log(`   Encrypted: ${encrypted.substring(0, 40)}...`);
  console.log(`   IV: ${iv}`);
  console.log(`   Tag: ${tag}\n`);

  // Decrypt
  const decrypted = decryptPrivateKey(encrypted, iv, tag);
  console.log('✅ Decryption successful');
  console.log(`   Decrypted: ${decrypted}\n`);

  // Verify
  if (decrypted === testPrivateKey) {
    console.log('✅ VERIFICATION PASSED: Decrypted key matches original!\n');
  } else {
    console.log('❌ VERIFICATION FAILED: Keys do not match\n');
  }
} catch (error: any) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

