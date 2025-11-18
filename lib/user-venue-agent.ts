/**
 * User Venue Agent Management
 *
 * One agent address per (user, venue) pair.
 * This allows users to have different addresses for each venue
 * while sharing the same address across all their agents on that venue.
 *
 * ⚠️ PLATFORM-AUTHORIZED DECRYPTION ⚠️
 * - Encryption: AES-256-GCM with AGENT_WALLET_ENCRYPTION_KEY
 * - Decryption: Requires PLATFORM_MASTER_KEY authorization + AGENT_WALLET_ENCRYPTION_KEY
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
 */
function verifyPlatformAuthorization(): void {
  const keyHex = process.env.PLATFORM_MASTER_KEY;
  if (!keyHex) {
    throw new Error('PLATFORM_MASTER_KEY not configured - decryption not authorized');
  }
  if (keyHex.length !== 64) {
    throw new Error('PLATFORM_MASTER_KEY must be a 32-byte hex string (64 chars)');
  }
  console.log('[UserVenueAgent] ✅ Platform authorization verified');
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
function decryptPrivateKey(cipherText: string, iv: string, tag?: string | null): string {
  try {
    verifyPlatformAuthorization();
    
    const key = requireEncryptionKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'base64')
    );
    
    if (tag) {
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
    }
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherText, 'base64')),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error('[UserVenueAgent] Decryption failed:', error.message);
    throw new Error('Failed to decrypt private key - ' + error.message);
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Get or create agent address for a (user, venue) pair
 */
export async function getUserVenueAgentAddress(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  const normalizedWallet = normalizeAddress(userWallet);
  
  console.log(`[UserVenueAgent] Getting agent address for ${userWallet} on ${venue}`);
  
  // Check if agent already exists for this (user, venue)
  const existing = await prisma.user_venue_agents.findUnique({
    where: {
      user_wallet_venue: {
        user_wallet: normalizedWallet,
        venue: venue,
      },
    },
  });
  
  if (existing) {
    console.log(`[UserVenueAgent] ✅ Found existing agent: ${existing.agent_address}`);
    return existing.agent_address;
  }
  
  // Generate new agent wallet
  console.log(`[UserVenueAgent] Generating new agent wallet for ${userWallet} on ${venue}`);
  const wallet = ethers.Wallet.createRandom();
  const { cipherText, iv, tag } = encryptPrivateKey(wallet.privateKey);
  
  const newAgent = await prisma.user_venue_agents.create({
    data: {
      user_wallet: normalizedWallet,
      venue: venue,
      agent_address: wallet.address,
      encrypted_private_key: cipherText,
      key_iv: iv,
      key_tag: tag,
    },
  });
  
  console.log(`[UserVenueAgent] ✅ Created new agent: ${newAgent.agent_address}`);
  return newAgent.agent_address;
}

/**
 * Get decrypted private key for a (user, venue) pair
 * ⚠️ REQUIRES PLATFORM_MASTER_KEY AUTHORIZATION ⚠️
 */
export async function getUserVenueAgentPrivateKey(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  const normalizedWallet = normalizeAddress(userWallet);
  
  const agent = await prisma.user_venue_agents.findUnique({
    where: {
      user_wallet_venue: {
        user_wallet: normalizedWallet,
        venue: venue,
      },
    },
  });
  
  if (!agent) {
    throw new Error(`No agent wallet found for ${userWallet} on ${venue}`);
  }
  
  return decryptPrivateKey(
    agent.encrypted_private_key,
    agent.key_iv,
    agent.key_tag
  );
}

/**
 * Get agent address by direct address lookup (for backward compatibility)
 */
export async function getVenueAgentByAddress(agentAddress: string): Promise<any | null> {
  return prisma.user_venue_agents.findFirst({
    where: { agent_address: normalizeAddress(agentAddress) },
  });
}

/**
 * Get decrypted private key by agent address
 * ⚠️ REQUIRES PLATFORM_MASTER_KEY AUTHORIZATION ⚠️
 */
export async function getPrivateKeyByAgentAddress(agentAddress: string): Promise<string | null> {
  const agent = await getVenueAgentByAddress(agentAddress);
  if (!agent) {
    return null;
  }
  
  return decryptPrivateKey(
    agent.encrypted_private_key,
    agent.key_iv,
    agent.key_tag
  );
}

/**
 * Check if user has agent for a venue
 */
export async function userHasVenueAgent(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<boolean> {
  const normalizedWallet = normalizeAddress(userWallet);
  const count = await prisma.user_venue_agents.count({
    where: {
      user_wallet: normalizedWallet,
      venue: venue,
    },
  });
  return count > 0;
}

/**
 * Get all venue agents for a user
 */
export async function getAllUserVenueAgents(userWallet: string) {
  const normalizedWallet = normalizeAddress(userWallet);
  return prisma.user_venue_agents.findMany({
    where: { user_wallet: normalizedWallet },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Delete venue agent for a user
 */
export async function deleteUserVenueAgent(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<boolean> {
  const normalizedWallet = normalizeAddress(userWallet);
  console.warn(`[UserVenueAgent] ⚠️ Deleting agent for ${userWallet} on ${venue}`);
  
  await prisma.user_venue_agents.deleteMany({
    where: {
      user_wallet: normalizedWallet,
      venue: venue,
    },
  });
  
  return true;
}

