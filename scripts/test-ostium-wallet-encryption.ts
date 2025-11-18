/**
 * Simple in-memory test to verify Ostium wallet encryption/decryption.
 * No database calls are made – we just generate a random wallet,
 * encrypt its private key, decrypt it back, and compare the results.
 */

import { ethers } from 'ethers';
import { agentWalletCrypto } from '../lib/hyperliquid-user-wallet';

async function runOstiumEncryptionTest() {
  console.log('🔐 Ostium Wallet Encryption Test (in-memory)');

  // Generate a random wallet to simulate an Ostium agent wallet
  const wallet = ethers.Wallet.createRandom();
  const originalKey = wallet.privateKey;

  console.log(`- Generated wallet address: ${wallet.address}`);
  console.log(`- Original private key (trimmed): ${originalKey.slice(0, -4)}****`);

  // Encrypt the private key using the same helper used in production
  const encrypted = agentWalletCrypto.encrypt(originalKey);
  console.log('- Encrypted payload:');
  console.log(`    cipherText: ${encrypted.cipherText}`);
  console.log(`    iv:         ${encrypted.iv}`);
  console.log(`    tag:        ${encrypted.tag}`);

  // Decrypt back to verify round-trip
  const decryptedKey = agentWalletCrypto.decrypt(
    encrypted.cipherText,
    encrypted.iv,
    encrypted.tag
  );

  console.log(`- Decrypted private key (trimmed): ${decryptedKey.slice(0, -4)}****`);
  console.log(
    `- Keys match: ${decryptedKey === originalKey ? '✅ YES' : '❌ NO'}`
  );

  if (decryptedKey !== originalKey) {
    throw new Error('Decrypted key does not match the original key!');
  }

  console.log('🎉 Ostium encryption/decryption round-trip succeeded without touching the DB.');
}

runOstiumEncryptionTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

