import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet, agentAddress } = req.body;

    if (!agentId || !userWallet || !agentAddress) {
      return res.status(400).json({
        error: 'agentId, userWallet, and agentAddress are required',
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
      return res.status(200).json({
        success: true,
        deployment: existingDeployment,
        message: 'Deployment already exists',
      });
    }

    // Get agent to check venue
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Vprime: For MULTI venue agents, enable both Hyperliquid and Ostium
    // For single-venue agents, only enable that venue
    const enabledVenues = agent.venue === 'MULTI' 
      ? ['HYPERLIQUID', 'OSTIUM'] 
      : ['OSTIUM'];

    // Create new deployment
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agentId,
        user_wallet: userWallet,
        safe_wallet: userWallet, // For Ostium, safe_wallet = user's Arbitrum wallet
        ostium_agent_address: agentAddress, // Use dedicated Ostium field
        enabled_venues: enabledVenues, // Vprime: Agent Where routing
        status: 'ACTIVE',
        module_enabled: true, // Ostium doesn't need Safe module
      },
    });

    console.log('[Ostium Create Deployment] Created deployment:', deployment.id);

    return res.status(200).json({
      success: true,
      deployment,
    });
  } catch (error: any) {
    console.error('[Ostium Create Deployment API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create deployment',
    });
  }
}

