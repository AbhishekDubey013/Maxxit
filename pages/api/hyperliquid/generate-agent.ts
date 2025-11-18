/**
 * Generate Agent Wallet for Hyperliquid Trading
 * Uses new user_venue_agents table - one agent address per (user, venue) pair
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getDeploymentVenueAgentAddress } from '../../../lib/user-venue-agent';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deploymentId } = req.body;

    if (!deploymentId) {
      return res.status(400).json({ error: 'deploymentId required' });
    }

    // Find deployment
    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: deploymentId },
      include: { agents: true }
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Get or create agent address for this deployment on Hyperliquid
    // Uses deployment_venue_agents table - one unique address per (deployment, venue)
    const agentAddress = await getDeploymentVenueAgentAddress(deployment.id, 'HYPERLIQUID');

    console.log('[HyperliquidAgent] Agent address for user:', agentAddress);

    return res.status(200).json({
      success: true,
      agentAddress,
      message: 'Agent wallet ready',
      instructions: [
        '1. Go to Hyperliquid (testnet or mainnet)',
        '2. Navigate to Settings → API/Agent',
        `3. Add this agent address: ${agentAddress}`,
        '4. Agent will now be able to trade on your behalf (non-custodial)',
        '5. Agent CANNOT withdraw your funds (Hyperliquid security)'
      ]
    });
  } catch (error: any) {
    console.error('[HyperliquidAgent] Error generating agent:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to generate agent wallet' 
    });
  } finally {
    await prisma.$disconnect();
  }
}

