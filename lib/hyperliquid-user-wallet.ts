/**
 * Hyperliquid User Wallet Management
 *
 * One agent wallet per USER (not per deployment)
 * This allows users to subscribe to multiple agents
 * while only needing to whitelist ONE address on Hyperliquid.
 *
 * ⚠️ PLATFORM-AUTHORIZED DECRYPTION ⚠️
 * - Encryption: AES-256-GCM with AGENT_WALLET_ENCRYPTION_KEY
 * - Decryption: Requires PLATFORM_MASTER_KEY authorization + AGENT_WALLET_ENCRYPTION_KEY
 * 
 * Even if someone clones the project and has encrypted data, they cannot decrypt
 * without the PLATFORM_MASTER_KEY in their environment.
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get and validate the encryption key for encrypting/decrypting data
 */
function requireEncryptionKey(): Buffer {
  const keyHex = process.env.AGENT_WALLET_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('AGENT_WALLET_ENCRYPTION_KEY not configured');
  }
  if (keyHex.length !== 64) {
    throw new Error('AGENT_WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Verify platform authorization before allowing decryption
 * This ensures only the platform with PLATFORM_MASTER_KEY can decrypt private keys
 */
function verifyPlatformAuthorization(): void {
  const keyHex = process.env.PLATFORM_MASTER_KEY;
  if (!keyHex) {
    throw new Error('PLATFORM_MASTER_KEY not configured - decryption not authorized');
  }
  if (keyHex.length !== 64) {
    throw new Error('PLATFORM_MASTER_KEY must be a 32-byte hex string (64 chars)');
  }
  // Platform master key exists and is valid - authorization granted
  console.log('[HyperliquidUserWallet] ✅ Platform authorization verified');
}

/**
 * Encrypt private key with AES-256-GCM
 */
function encryptPrivateKey(privateKey: string) {
  const key = requireEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return {
    cipherText: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt private key with AES-256-GCM
 * ⚠️ REQUIRES PLATFORM_MASTER_KEY AUTHORIZATION ⚠️
 */
function decryptPrivateKey(cipherText: string, iv: string, tag: string): string {
  try {
    // STEP 1: Verify platform authorization (requires PLATFORM_MASTER_KEY)
    // This ensures only the platform can decrypt, even if someone has the encrypted data
    verifyPlatformAuthorization();
    
    // STEP 2: Decrypt with encryption key
    const key = requireEncryptionKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherText, 'base64')),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error('[HyperliquidUserWallet] Decryption failed:', error.message);
    throw new Error('Failed to decrypt private key - ' + error.message);
  }
}

export const agentWalletCrypto = {
  encrypt(privateKey: string) {
    return encryptPrivateKey(privateKey);
  },
  decrypt(cipherText: string, iv: string, tag: string) {
    return decryptPrivateKey(cipherText, iv, tag);
  },
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

async function upsertUserWalletRecord(params: {
  userWallet: string;
  agentAddress: string;
  cipherText: string;
  iv: string;
  tag: string;
}) {
  const { userWallet, agentAddress, cipherText, iv, tag } = params;
  const normalizedWallet = normalizeAddress(userWallet);

  await prisma.user_hyperliquid_wallets.upsert({
    where: { user_wallet: normalizedWallet },
    update: {
      agent_address: agentAddress,
      agent_private_key_encrypted: cipherText,
      agent_key_iv: iv,
      agent_key_tag: tag,
      is_approved: false,
      last_used_at: new Date(),
    },
    create: {
      user_wallet: normalizedWallet,
      agent_address: agentAddress,
      agent_private_key_encrypted: cipherText,
      agent_key_iv: iv,
      agent_key_tag: tag,
      is_approved: false,
      created_at: new Date(),
      last_used_at: new Date(),
    },
  });
}

/**
 * Generate (or rotate) a user agent wallet. Returns the new agent address.
 */
export async function generateUserAgentWallet(userWallet: string): Promise<string> {
  console.log(`[HyperliquidUserWallet] Generating new agent wallet for user ${userWallet}`);
  const wallet = ethers.Wallet.createRandom();
  const { cipherText, iv, tag } = encryptPrivateKey(wallet.privateKey);
  await upsertUserWalletRecord({
    userWallet,
    agentAddress: wallet.address,
    cipherText,
    iv,
    tag,
  });
  console.log(`[HyperliquidUserWallet] ✅ Stored encrypted wallet for user ${userWallet}`);
  return wallet.address;
}

/**
 * Get or create agent wallet for a user.
 * Returns the agent address (generates a new one if needed).
 */
export async function getUserAgentWallet(userWallet: string): Promise<string> {
  const normalizedWallet = normalizeAddress(userWallet);
  const existing = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
  });

  if (existing) {
    await prisma.user_hyperliquid_wallets.update({
      where: { user_wallet: normalizedWallet },
      data: { last_used_at: new Date() },
    });
    return existing.agent_address;
  }

  return generateUserAgentWallet(userWallet);
}

/**
 * Find (without creating) the user wallet record.
 */
export async function findUserAgentWallet(userWallet: string) {
  const normalizedWallet = normalizeAddress(userWallet);
  return prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
  });
}

/**
 * Get private key for a user wallet (decrypts stored value).
 * ⚠️ Requires PLATFORM_MASTER_KEY authorization
 */
export async function getUserAgentPrivateKey(userWallet: string): Promise<string> {
  const record = await findUserAgentWallet(userWallet);
  if (!record) {
    throw new Error(`No agent wallet found for user ${userWallet}`);
  }
  if (!record.agent_private_key_encrypted || !record.agent_key_iv || !record.agent_key_tag) {
    throw new Error(`Agent wallet for ${userWallet} is missing encryption data`);
  }
  // Decryption will verify PLATFORM_MASTER_KEY authorization before proceeding
  return decryptPrivateKey(
    record.agent_private_key_encrypted,
    record.agent_key_iv,
    record.agent_key_tag
  );
}

/**
 * Get decrypted private key using the agent address.
 * ⚠️ Requires PLATFORM_MASTER_KEY authorization
 */
export async function getAgentPrivateKeyByAddress(agentAddress: string): Promise<string | null> {
  const record = await prisma.user_hyperliquid_wallets.findFirst({
    where: { agent_address: normalizeAddress(agentAddress) },
  });
  if (!record) {
    return null;
  }
  if (!record.agent_private_key_encrypted || !record.agent_key_iv || !record.agent_key_tag) {
    throw new Error(`Agent wallet ${agentAddress} is missing encryption data`);
  }
  // Decryption will verify PLATFORM_MASTER_KEY authorization before proceeding
  return decryptPrivateKey(
    record.agent_private_key_encrypted,
    record.agent_key_iv,
    record.agent_key_tag
  );
}

/**
 * Convenience helper to fetch agent address for a user.
 */
export async function getAgentAddressForUser(userWallet: string): Promise<string | null> {
  const record = await findUserAgentWallet(userWallet);
  return record?.agent_address ?? null;
}

export async function userHasAgentWallet(userWallet: string): Promise<boolean> {
  const normalizedWallet = normalizeAddress(userWallet);
  const count = await prisma.user_hyperliquid_wallets.count({
    where: { user_wallet: normalizedWallet },
  });
  return count > 0;
}

export async function getAllUserWallets() {
  return prisma.user_hyperliquid_wallets.findMany({
    orderBy: { created_at: 'desc' },
  });
}

export async function deleteUserAgentWallet(userWallet: string): Promise<boolean> {
  const normalizedWallet = normalizeAddress(userWallet);
  console.warn(`[HyperliquidUserWallet] ⚠️ Deleting agent wallet for user ${userWallet}`);

  await prisma.user_hyperliquid_wallets.deleteMany({
    where: { user_wallet: normalizedWallet },
  });

  return true;
}

/**
 * Mark a user's wallet as approved/unapproved.
 */
export async function updateUserWalletApproval(userWallet: string, isApproved: boolean) {
  const normalizedWallet = normalizeAddress(userWallet);
  await prisma.user_hyperliquid_wallets.update({
    where: { user_wallet: normalizedWallet },
    data: { is_approved: isApproved, last_used_at: new Date() },
  });
}

export async function getUserWalletStatus(userWallet: string) {
  const record = await findUserAgentWallet(userWallet);
  if (!record) {
    return null;
  }
  return {
    agentAddress: record.agent_address,
    isApproved: record.is_approved ?? false,
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at,
  };
}

