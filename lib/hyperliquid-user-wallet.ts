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

const ENCRYPTION_KEY = Buffer.from(
  process.env.AGENT_WALLET_ENCRYPTION_KEY || '',
  'hex'
);

if (!process.env.AGENT_WALLET_ENCRYPTION_KEY) {
  console.warn('[HyperliquidUserWallet] WARNING: AGENT_WALLET_ENCRYPTION_KEY not set!');
}

/**
 * Generate a new agent wallet for a user
 * Creates a random EOA wallet, encrypts private key, stores in database
 */
export async function generateUserAgentWallet(userWallet: string): Promise<string> {
  console.log(`[HyperliquidUserWallet] Generating new agent wallet for user ${userWallet}`);

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  const agentAddress = wallet.address;
  const privateKey = wallet.privateKey;

  console.log(`[HyperliquidUserWallet] Generated address: ${agentAddress}`);

  // Encrypt private key with AES-256-GCM
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Store in database
  await prisma.user_hyperliquid_wallets.create({
    data: {
      user_wallet: userWallet.toLowerCase(),
      agent_address: agentAddress,
      agent_private_key_encrypted: encrypted,
      agent_key_iv: iv.toString('hex'),
      agent_key_tag: authTag.toString('hex'),
    },
  });

  console.log(`[HyperliquidUserWallet] ✅ Stored encrypted wallet for user ${userWallet}`);
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
 * Get decrypted private key for user's agent wallet
 */
export async function getUserAgentPrivateKey(userWallet: string): Promise<string> {
  const normalizedWallet = userWallet.toLowerCase();
  
  const wallet = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: normalizedWallet },
  });

  if (!wallet) {
    throw new Error(`No agent wallet found for user ${userWallet}`);
  }

  try {
    // Decrypt private key
    const iv = Buffer.from(wallet.agent_key_iv, 'hex');
    const authTag = Buffer.from(wallet.agent_key_tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(wallet.agent_private_key_encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error(`[HyperliquidUserWallet] Failed to decrypt private key for user ${userWallet}:`, error.message);
    throw new Error('Failed to decrypt agent wallet private key. Encryption key may be incorrect.');
  }
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

