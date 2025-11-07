import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption key from environment (must match decryption key!)
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY;

function encryptPrivateKey(privateKey: string): { encrypted: string; iv: string; tag: string } {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: agentId } = req.query;
  const { deploymentId } = req.body;

  if (typeof agentId !== 'string') {
    return res.status(400).json({ error: 'Invalid agent ID' });
  }

  if (!deploymentId) {
    return res.status(400).json({ error: 'Deployment ID required' });
  }

  try {
    // Check if deployment already has an agent
    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: deploymentId }
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.hyperliquid_agent_address) {
      // Agent already exists for this deployment
      return res.status(200).json({
        agentAddress: deployment.hyperliquid_agent_address,
        alreadyExists: true
      });
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const agentAddress = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt private key
    const { encrypted, iv, tag } = encryptPrivateKey(privateKey);

    // Save to database
    await prisma.agent_deployments.update({
      where: { id: deploymentId },
      data: {
        hyperliquid_agent_address: agentAddress,
        hyperliquid_agent_key_encrypted: encrypted,
        hyperliquid_agent_key_iv: iv,
        hyperliquid_agent_key_tag: tag
      }
    });

    console.log(`[HyperliquidAgent] Generated unique agent for deployment ${deploymentId}: ${agentAddress}`);

    return res.status(200).json({
      agentAddress,
      alreadyExists: false
    });
  } catch (error: any) {
    console.error(`[HyperliquidAgent] Error generating agent:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

