/**
 * Deployment Venue Agent Management
 *
 * One agent address per (deployment, venue) pair.
 * Each agent deployment gets unique addresses for each venue.
 * This ensures isolation between different agents.
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
 * Get or create agent address for a (deployment, venue) pair
 * Each agent deployment gets its own unique address per venue
 */
export async function getDeploymentVenueAgentAddress(
  deploymentId: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  console.log(`[DeploymentVenueAgent] Getting agent address for deployment ${deploymentId} on ${venue}`);
  
  // Check if agent already exists for this (deployment, venue)
  const existing = await prisma.deployment_venue_agents.findUnique({
    where: {
      deployment_id_venue: {
        deployment_id: deploymentId,
        venue: venue,
      },
    },
  });
  
  if (existing) {
    console.log(`[DeploymentVenueAgent] ✅ Found existing agent: ${existing.agent_address}`);
    return existing.agent_address;
  }
  
  // Generate new agent wallet
  console.log(`[DeploymentVenueAgent] Generating new agent wallet for deployment ${deploymentId} on ${venue}`);
  const wallet = ethers.Wallet.createRandom();
  const { cipherText, iv, tag } = encryptPrivateKey(wallet.privateKey);
  
  const newAgent = await prisma.deployment_venue_agents.create({
    data: {
      deployment_id: deploymentId,
      venue: venue,
      agent_address: wallet.address,
      encrypted_private_key: cipherText,
      key_iv: iv,
      key_tag: tag,
    },
  });
  
  console.log(`[DeploymentVenueAgent] ✅ Created new agent: ${newAgent.agent_address}`);
  return newAgent.agent_address;
}

/**
 * Legacy function for backward compatibility
 * Maps (user_wallet, venue) to first deployment's address
 * @deprecated Use getDeploymentVenueAgentAddress instead
 */
export async function getUserVenueAgentAddress(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  console.warn(`[DEPRECATED] getUserVenueAgentAddress called - use getDeploymentVenueAgentAddress instead`);
  
  // Find first active deployment for this user
  const deployment = await prisma.agent_deployments.findFirst({
    where: {
      user_wallet: normalizeAddress(userWallet),
      status: 'ACTIVE',
    },
    orderBy: { sub_started_at: 'asc' }
  });
  
  if (!deployment) {
    throw new Error(`No active deployment found for user ${userWallet}`);
  }
  
  return getDeploymentVenueAgentAddress(deployment.id, venue);
}

/**
 * Get decrypted private key for a (deployment, venue) pair
 * ⚠️ REQUIRES PLATFORM_MASTER_KEY AUTHORIZATION ⚠️
 */
export async function getDeploymentVenueAgentPrivateKey(
  deploymentId: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  const agent = await prisma.deployment_venue_agents.findUnique({
    where: {
      deployment_id_venue: {
        deployment_id: deploymentId,
        venue: venue,
      },
    },
  });
  
  if (!agent) {
    throw new Error(`No agent wallet found for deployment ${deploymentId} on ${venue}`);
  }
  
  return decryptPrivateKey(
    agent.encrypted_private_key,
    agent.key_iv,
    agent.key_tag
  );
}

/**
 * @deprecated Use getDeploymentVenueAgentPrivateKey instead
 */
export async function getUserVenueAgentPrivateKey(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  console.warn(`[DEPRECATED] getUserVenueAgentPrivateKey called`);
  const deployment = await prisma.agent_deployments.findFirst({
    where: { user_wallet: normalizeAddress(userWallet), status: 'ACTIVE' },
    orderBy: { sub_started_at: 'asc' }
  });
  
  if (!deployment) {
    throw new Error(`No active deployment found for user ${userWallet}`);
  }
  
  return getDeploymentVenueAgentPrivateKey(deployment.id, venue);
}

/**
 * Get agent address by direct address lookup
 */
export async function getVenueAgentByAddress(agentAddress: string): Promise<any | null> {
  return prisma.deployment_venue_agents.findFirst({
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
 * Check if deployment has agent for a venue
 */
export async function deploymentHasVenueAgent(
  deploymentId: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<boolean> {
  const count = await prisma.deployment_venue_agents.count({
    where: {
      deployment_id: deploymentId,
      venue: venue,
    },
  });
  return count > 0;
}

/**
 * Get all venue agents for a deployment
 */
export async function getAllDeploymentVenueAgents(deploymentId: string) {
  return prisma.deployment_venue_agents.findMany({
    where: { deployment_id: deploymentId },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Delete venue agent for a deployment
 */
export async function deleteDeploymentVenueAgent(
  deploymentId: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<boolean> {
  console.warn(`[DeploymentVenueAgent] ⚠️ Deleting agent for deployment ${deploymentId} on ${venue}`);
  
  await prisma.deployment_venue_agents.deleteMany({
    where: {
      deployment_id: deploymentId,
      venue: venue,
    },
  });
  
  return true;
}

