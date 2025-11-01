/**
 * Register Agent Wallet for Hyperliquid Trading
 * Creates a dedicated EOA wallet for a Safe to use on Hyperliquid
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption settings (use proper key management in production!)
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY || 
  crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt private key
 */
function encryptPrivateKey(privateKey: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt private key
 */
export function decryptPrivateKey(encrypted: string, iv: string, tag: string): string {
  // Hash the encryption key to get the 256-bit key (same as encryption)
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { safeAddress } = req.body;

    if (!safeAddress) {
      return res.status(400).json({ error: 'safeAddress required' });
    }

    // Find deployment for this Safe
    const deployment = await prisma.agent_deployments.findFirst({
      where: { safe_wallet: safeAddress.toLowerCase() },
      include: { agents: true }
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Check if agent wallet already exists
    const existingMetadata = deployment.agents as any;
    if (existingMetadata?.hyperliquid_agent_address) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        agentAddress: existingMetadata.hyperliquid_agent_address,
        message: 'Agent wallet already registered',
      });
    }

    // Generate new agent wallet
    const agentWallet = ethers.Wallet.createRandom();
    const agentAddress = agentWallet.address;
    const agentPrivateKey = agentWallet.privateKey;

    console.log('[HyperliquidAgent] Generated agent wallet:', agentAddress, 'for Safe:', safeAddress);

    // Encrypt private key
    const { encrypted, iv, tag } = encryptPrivateKey(agentPrivateKey);

    // Store encrypted private key in database
    // We'll use the agents table's metadata or create a separate table
    await prisma.agent_deployments.update({
      where: { id: deployment.id },
      data: {
        agents: {
          update: {
            ...existingMetadata,
            hyperliquid_agent_address: agentAddress,
            hyperliquid_agent_key_encrypted: encrypted,
            hyperliquid_agent_key_iv: iv,
            hyperliquid_agent_key_tag: tag,
          }
        }
      }
    });

    console.log('[HyperliquidAgent] Agent wallet registered successfully');

    return res.status(200).json({
      success: true,
      agentAddress,
      message: 'Agent wallet registered. Users can now bridge USDC to Hyperliquid.',
      instructions: [
        `1. Bridge USDC from your Safe (${safeAddress}) to Hyperliquid`,
        `2. Use the Hyperliquid bridge: https://app.hyperliquid.xyz/bridge`,
        `3. Agent wallet ${agentAddress} will execute trades on your behalf`,
        `4. Profits can be collected by the profit receiver`
      ]
    });
  } catch (error: any) {
    console.error('[HyperliquidAgent] Registration error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to register agent wallet' 
    });
  }
}

/**
 * Get agent private key for a deployment
 */
export async function getAgentPrivateKey(deploymentId: string): Promise<string | null> {
  try {
    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: deploymentId },
      include: { agents: true }
    });

    if (!deployment) {
      return null;
    }

    // Check deployment's unique agent key first
    if (deployment.hyperliquid_agent_key_encrypted) {
      console.log('[HyperliquidAgent] Using unique agent key for deployment:', deploymentId);
      return decryptPrivateKey(
        deployment.hyperliquid_agent_key_encrypted,
        deployment.hyperliquid_agent_key_iv!,
        deployment.hyperliquid_agent_key_tag!
      );
    }

    // Fallback to shared agent key from environment (for backwards compatibility)
    const sharedAgentKey = process.env.HYPERLIQUID_AGENT_PRIVATE_KEY;
    if (sharedAgentKey) {
      console.log('[HyperliquidAgent] Using shared agent key from environment (fallback)');
      return sharedAgentKey.startsWith('0x') ? sharedAgentKey : `0x${sharedAgentKey}`;
    }

    console.warn('[HyperliquidAgent] No agent key found for deployment:', deploymentId);
    return null;
  } catch (error) {
    console.error('[HyperliquidAgent] Failed to get agent private key:', error);
    return null;
  }
}

