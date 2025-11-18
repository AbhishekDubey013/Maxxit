import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserVenueAgentAddress } from '../../../lib/user-venue-agent';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet } = req.body;

    if (!agentId || !userWallet) {
      return res.status(400).json({
        error: 'agentId and userWallet are required',
      });
    }

    // Check if deployment already exists
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: {
        agent_id: agentId,
        user_wallet: userWallet,
      },
    });

    if (existingDeployment) {
      console.log('[Ostium Create Deployment] Deployment already exists:', existingDeployment.id);
      
      // Get agent address for Ostium
      const agentAddress = await getUserVenueAgentAddress(userWallet, 'OSTIUM');
      
      return res.status(200).json({
        success: true,
        deployment: existingDeployment,
        agentAddress,
        message: 'Deployment already exists',
      });
    }

    // Get agent to verify it exists
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get or create agent address for this user on Ostium
    const agentAddress = await getUserVenueAgentAddress(userWallet, 'OSTIUM');

    console.log('[Ostium Create Deployment] Agent address for Ostium:', agentAddress);

    // All agents are multi-venue now
    const enabledVenues = ['OSTIUM'];

    // Create new deployment
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agentId,
        user_wallet: userWallet,
        safe_wallet: userWallet, // For Ostium, safe_wallet = user's Arbitrum wallet
        enabled_venues: enabledVenues,
        status: 'ACTIVE',
        module_enabled: true, // Ostium doesn't need Safe module
      },
    });

    console.log('[Ostium Create Deployment] Created deployment:', deployment.id);

    return res.status(200).json({
      success: true,
      deployment,
      agentAddress,
    });
  } catch (error: any) {
    console.error('[Ostium Create Deployment API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create deployment',
    });
  }
}

