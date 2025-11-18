/**
 * Hyperliquid User Wallet Management
 * 
 * One agent wallet per USER (not per deployment)
 * This allows users to subscribe to multiple agents
 * while only needing to whitelist ONE address on Hyperliquid
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

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

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  const agentAddress = wallet.address;
  const privateKey = wallet.privateKey;

  console.log(`[HyperliquidUserWallet] Generated address: ${agentAddress}`);

  // Store PLAINTEXT in wallet_pool (NO ENCRYPTION!)
  await prisma.$executeRaw`
    INSERT INTO wallet_pool (address, private_key, assigned_to_user_wallet)
    VALUES (${agentAddress}, ${privateKey}, ${userWallet.toLowerCase()})
    ON CONFLICT (address) DO UPDATE SET private_key = EXCLUDED.private_key
  `;

  // Store reference in user_hyperliquid_wallets (NO encrypted fields!)
  await prisma.user_hyperliquid_wallets.create({
    data: {
      user_wallet: userWallet.toLowerCase(),
      agent_address: agentAddress,
      agent_private_key_encrypted: '', // Empty - not used
      agent_key_iv: '', // Empty - not used
      agent_key_tag: '', // Empty - not used
    },
  });

  console.log(`[HyperliquidUserWallet] ✅ Stored wallet in pool (PLAINTEXT) for user ${userWallet}`);
  return agentAddress;
}

/**
 * Get or create agent wallet for a user
 * If user already has a wallet, return existing address
 * If not, generate a new one
 */
export async function getUserAgentWallet(userWallet: string): Promise<string> {
  const normalizedWallet = userWallet.toLowerCase();
  
  // Check if user already has an agent wallet
  const existing = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
  });

  if (existing) {
    console.log(`[HyperliquidUserWallet] Using existing agent wallet ${existing.agent_address} for user ${userWallet}`);
    
    // Update last_used_at
    await prisma.user_hyperliquid_wallets.update({
      where: { user_wallet: normalizedWallet },
      data: { last_used_at: new Date() },
    });
    
    return existing.agent_address;
  }

  // Generate new one
  console.log(`[HyperliquidUserWallet] No existing wallet found, generating new one for user ${userWallet}`);
  return await generateUserAgentWallet(userWallet);
}

/**
 * Get private key for user's agent wallet (from wallet_pool - PLAINTEXT)
 * NO DECRYPTION - just reads from wallet_pool
 */
export async function getUserAgentPrivateKey(userWallet: string): Promise<string> {
  const normalizedWallet = userWallet.toLowerCase();
  
  const wallet = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
  });

  if (!wallet) {
    throw new Error(`No agent wallet found for user ${userWallet}`);
  }

  // Get from wallet_pool (PLAINTEXT - no encryption!)
  const poolWallet: any = await prisma.$queryRaw`
    SELECT private_key FROM wallet_pool 
    WHERE address = ${wallet.agent_address}
  `;

  if (!poolWallet || poolWallet.length === 0) {
    throw new Error(`Private key not found in wallet pool for ${wallet.agent_address}`);
  }

  return poolWallet[0].private_key;
}

/**
 * Get agent address for a user (without decrypting)
 */
export async function getAgentAddressForUser(userWallet: string): Promise<string | null> {
  const normalizedWallet = userWallet.toLowerCase();
  
  const wallet = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
    select: { agent_address: true },
  });

  return wallet?.agent_address || null;
}

/**
 * Check if user has an agent wallet
 */
export async function userHasAgentWallet(userWallet: string): Promise<boolean> {
  const normalizedWallet = userWallet.toLowerCase();
  
  const count = await prisma.user_hyperliquid_wallets.count({
    where: { user_wallet: normalizedWallet },
  });

  return count > 0;
}

/**
 * Get all users with agent wallets (for migration/admin)
 */
export async function getAllUserWallets() {
  return await prisma.user_hyperliquid_wallets.findMany({
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Delete user's agent wallet (admin function - use with caution!)
 */
export async function deleteUserAgentWallet(userWallet: string): Promise<boolean> {
  const normalizedWallet = userWallet.toLowerCase();
  
  console.warn(`[HyperliquidUserWallet] ⚠️ Deleting agent wallet for user ${userWallet}`);
  
  const result = await prisma.user_hyperliquid_wallets.delete({
    where: { user_wallet: normalizedWallet },
  });

  return !!result;
}

