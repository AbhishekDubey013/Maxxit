/**
 * Deployment-Specific Agent Address Management
 * 
 * Generates unique agent addresses per deployment (not per user)
 * Each deployment gets its own agent address and encrypted private key
 */

import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('[DeploymentAgentAddress] ⚠️  No ENCRYPTION_KEY found - using fallback (NOT SECURE FOR PRODUCTION)');
}

// Derive 32-byte key from environment variable
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    // Fallback for development
    return crypto.scryptSync('fallback-dev-key', 'salt', 32);
  }
  return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
}

/**
 * Encrypt private key using AES-256-GCM
 */
function encryptPrivateKey(privateKey: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt private key using AES-256-GCM
 */
function decryptPrivateKey(
  encrypted: string,
  iv: string,
  tag: string
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new agent wallet address and private key
 * Returns the address and encrypted private key
 */
export function generateAgentWallet(): {
  address: string;
  privateKey: string;
  encrypted: {
    encrypted: string;
    iv: string;
    tag: string;
  };
} {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const privateKey = wallet.privateKey;

  const encrypted = encryptPrivateKey(privateKey);

  console.log('[DeploymentAgentAddress] Generated new agent wallet:', address);

  return {
    address,
    privateKey,
    encrypted,
  };
}

/**
 * Get or create Hyperliquid agent address for a specific deployment
 * Each deployment gets its own unique agent address
 */
export async function getOrCreateHyperliquidAgentAddress(params: {
  deploymentId: string;
}): Promise<{
  address: string;
  privateKey: string;
}> {
  const { deploymentId } = params;

  // Check if deployment already has an agent address
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: deploymentId },
    select: {
      hyperliquid_agent_address: true,
      hyperliquid_agent_key_encrypted: true,
      hyperliquid_agent_key_iv: true,
      hyperliquid_agent_key_tag: true,
    },
  });

  if (!deployment) {
    throw new Error(`Deployment not found: ${deploymentId}`);
  }

  // If address already exists, decrypt and return
  if (
    deployment.hyperliquid_agent_address &&
    deployment.hyperliquid_agent_key_encrypted &&
    deployment.hyperliquid_agent_key_iv &&
    deployment.hyperliquid_agent_key_tag
  ) {
    console.log('[DeploymentAgentAddress] Using existing Hyperliquid address:', deployment.hyperliquid_agent_address);
    
    const privateKey = decryptPrivateKey(
      deployment.hyperliquid_agent_key_encrypted,
      deployment.hyperliquid_agent_key_iv,
      deployment.hyperliquid_agent_key_tag
    );

    return {
      address: deployment.hyperliquid_agent_address,
      privateKey,
    };
  }

  // Generate new agent wallet
  const wallet = generateAgentWallet();

  // Store in deployment
  await prisma.agent_deployments.update({
    where: { id: deploymentId },
    data: {
      hyperliquid_agent_address: wallet.address,
      hyperliquid_agent_key_encrypted: wallet.encrypted.encrypted,
      hyperliquid_agent_key_iv: wallet.encrypted.iv,
      hyperliquid_agent_key_tag: wallet.encrypted.tag,
    },
  });

  console.log('[DeploymentAgentAddress] ✅ Created new Hyperliquid agent address for deployment:', wallet.address);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Get or create Ostium agent address for a specific deployment
 * Each deployment gets its own unique agent address
 */
export async function getOrCreateOstiumAgentAddress(params: {
  deploymentId: string;
}): Promise<{
  address: string;
  privateKey: string;
}> {
  const { deploymentId } = params;

  // Check if deployment already has an agent address
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: deploymentId },
    select: {
      ostium_agent_address: true,
      ostium_agent_key_encrypted: true,
      ostium_agent_key_iv: true,
      ostium_agent_key_tag: true,
    },
  });

  if (!deployment) {
    throw new Error(`Deployment not found: ${deploymentId}`);
  }

  // If address already exists, decrypt and return
  if (
    deployment.ostium_agent_address &&
    deployment.ostium_agent_key_encrypted &&
    deployment.ostium_agent_key_iv &&
    deployment.ostium_agent_key_tag
  ) {
    console.log('[DeploymentAgentAddress] Using existing Ostium address:', deployment.ostium_agent_address);
    
    const privateKey = decryptPrivateKey(
      deployment.ostium_agent_key_encrypted,
      deployment.ostium_agent_key_iv,
      deployment.ostium_agent_key_tag
    );

    return {
      address: deployment.ostium_agent_address,
      privateKey,
    };
  }

  // Generate new agent wallet
  const wallet = generateAgentWallet();

  // Store in deployment
  await prisma.agent_deployments.update({
    where: { id: deploymentId },
    data: {
      ostium_agent_address: wallet.address,
      ostium_agent_key_encrypted: wallet.encrypted.encrypted,
      ostium_agent_key_iv: wallet.encrypted.iv,
      ostium_agent_key_tag: wallet.encrypted.tag,
    },
  });

  console.log('[DeploymentAgentAddress] ✅ Created new Ostium agent address for deployment:', wallet.address);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Get private key for a deployment's Hyperliquid agent address
 */
export async function getHyperliquidPrivateKey(deploymentId: string): Promise<string> {
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: deploymentId },
    select: {
      hyperliquid_agent_key_encrypted: true,
      hyperliquid_agent_key_iv: true,
      hyperliquid_agent_key_tag: true,
    },
  });

  if (
    !deployment ||
    !deployment.hyperliquid_agent_key_encrypted ||
    !deployment.hyperliquid_agent_key_iv ||
    !deployment.hyperliquid_agent_key_tag
  ) {
    throw new Error(`No Hyperliquid agent key found for deployment: ${deploymentId}`);
  }

  return decryptPrivateKey(
    deployment.hyperliquid_agent_key_encrypted,
    deployment.hyperliquid_agent_key_iv,
    deployment.hyperliquid_agent_key_tag
  );
}

/**
 * Get private key for a deployment's Ostium agent address
 */
export async function getOstiumPrivateKey(deploymentId: string): Promise<string> {
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: deploymentId },
    select: {
      ostium_agent_key_encrypted: true,
      ostium_agent_key_iv: true,
      ostium_agent_key_tag: true,
    },
  });

  if (
    !deployment ||
    !deployment.ostium_agent_key_encrypted ||
    !deployment.ostium_agent_key_iv ||
    !deployment.ostium_agent_key_tag
  ) {
    throw new Error(`No Ostium agent key found for deployment: ${deploymentId}`);
  }

  return decryptPrivateKey(
    deployment.ostium_agent_key_encrypted,
    deployment.ostium_agent_key_iv,
    deployment.ostium_agent_key_tag
  );
}

/**
 * Get private key by agent address (for backward compatibility)
 * Searches across all deployments
 */
export async function getPrivateKeyByAddress(agentAddress: string): Promise<string | null> {
  const normalizedAddress = agentAddress.toLowerCase();

  // Try Hyperliquid deployments first
  const hlDeployment = await prisma.agent_deployments.findFirst({
    where: {
      hyperliquid_agent_address: {
        equals: normalizedAddress,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      hyperliquid_agent_key_encrypted: true,
      hyperliquid_agent_key_iv: true,
      hyperliquid_agent_key_tag: true,
    },
  });

  if (
    hlDeployment &&
    hlDeployment.hyperliquid_agent_key_encrypted &&
    hlDeployment.hyperliquid_agent_key_iv &&
    hlDeployment.hyperliquid_agent_key_tag
  ) {
    return decryptPrivateKey(
      hlDeployment.hyperliquid_agent_key_encrypted,
      hlDeployment.hyperliquid_agent_key_iv,
      hlDeployment.hyperliquid_agent_key_tag
    );
  }

  // Try Ostium deployments
  const ostiumDeployment = await prisma.agent_deployments.findFirst({
    where: {
      ostium_agent_address: {
        equals: normalizedAddress,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      ostium_agent_key_encrypted: true,
      ostium_agent_key_iv: true,
      ostium_agent_key_tag: true,
    },
  });

  if (
    ostiumDeployment &&
    ostiumDeployment.ostium_agent_key_encrypted &&
    ostiumDeployment.ostium_agent_key_iv &&
    ostiumDeployment.ostium_agent_key_tag
  ) {
    return decryptPrivateKey(
      ostiumDeployment.ostium_agent_key_encrypted,
      ostiumDeployment.ostium_agent_key_iv,
      ostiumDeployment.ostium_agent_key_tag
    );
  }

  return null;
}

