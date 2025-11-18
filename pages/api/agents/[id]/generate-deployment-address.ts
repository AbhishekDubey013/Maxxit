/**
 * Generate Agent Address for Deployment
 * 
 * Called when user initiates deployment to generate a unique agent address
 * Returns the address for user to whitelist on Hyperliquid/Ostium
 * 
 * Flow:
 * 1. User clicks "Deploy Agent"
 * 2. This API generates unique agent address
 * 3. Frontend shows modal with address for whitelisting
 * 4. User whitelists address on venue
 * 5. User confirms → create-deployment API is called
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateAgentWallet } from '../../../../lib/deployment-agent-address';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: agentId } = req.query;
    const { userWallet, venue } = req.body;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    if (!userWallet) {
      return res.status(400).json({ error: 'User wallet required' });
    }

    if (!venue || !['HYPERLIQUID', 'OSTIUM', 'MULTI'].includes(venue)) {
      return res.status(400).json({ error: 'Valid venue required (HYPERLIQUID, OSTIUM, or MULTI)' });
    }

    console.log('[GenerateDeploymentAddress] Generating address for:', {
      agentId,
      userWallet,
      venue,
    });

    // Check if agent exists
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        venue: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // For MULTI venue agents, generate addresses for both venues
    if (agent.venue === 'MULTI' || venue === 'MULTI') {
      const hyperliquidWallet = generateAgentWallet();
      const ostiumWallet = generateAgentWallet();

      console.log('[GenerateDeploymentAddress] ✅ Generated MULTI venue addresses');
      console.log('  Hyperliquid:', hyperliquidWallet.address);
      console.log('  Ostium:', ostiumWallet.address);

      return res.status(200).json({
        success: true,
        venue: 'MULTI',
        addresses: {
          hyperliquid: {
            address: hyperliquidWallet.address,
            encrypted: hyperliquidWallet.encrypted,
          },
          ostium: {
            address: ostiumWallet.address,
            encrypted: ostiumWallet.encrypted,
          },
        },
        message: 'Please whitelist both addresses',
      });
    }

    // Single venue agent
    const wallet = generateAgentWallet();

    console.log('[GenerateDeploymentAddress] ✅ Generated address:', wallet.address);

    return res.status(200).json({
      success: true,
      venue,
      address: wallet.address,
      encrypted: wallet.encrypted,
      message: `Please whitelist this address on ${venue}`,
    });
  } catch (error: any) {
    console.error('[GenerateDeploymentAddress] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

