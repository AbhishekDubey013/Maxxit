/**
 * Create or update deployment for Hyperliquid agent
 * Called when user approves agent on Hyperliquid
 */

import { NextApiRequest, NextApiResponse } from 'next';
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
        error: 'Missing required fields: agentId, userWallet' 
      });
    }

    console.log('[CreateDeployment] Creating deployment:', {
      agentId,
      userWallet,
    });

    // Check if agent exists
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get or create agent address for this user on Hyperliquid
    const agentAddress = await getUserVenueAgentAddress(userWallet, 'HYPERLIQUID');

    console.log('[CreateDeployment] Agent address for Hyperliquid:', agentAddress);

    // All agents are multi-venue now
    const enabledVenues = ['HYPERLIQUID'];

    const deploymentData = {
      safe_wallet: userWallet.toLowerCase(),
      enabled_venues: enabledVenues,
      status: 'ACTIVE' as const,
      sub_active: true,
    };

    // Check if deployment already exists for this agent and user
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: {
        agent_id: agentId,
        user_wallet: userWallet.toLowerCase(),
      },
    });

    let deployment;

    if (existingDeployment) {
      // Update existing deployment
      console.log('[CreateDeployment] Updating existing deployment:', existingDeployment.id);
      deployment = await prisma.agent_deployments.update({
        where: { id: existingDeployment.id },
        data: deploymentData,
      });
    } else {
      // Create new deployment
      console.log('[CreateDeployment] Creating new deployment');
      deployment = await prisma.agent_deployments.create({
        data: {
          agent_id: agentId,
          user_wallet: userWallet.toLowerCase(),
          ...deploymentData,
        },
      });
    }

    console.log('[CreateDeployment] ✅ Deployment created/updated:', deployment.id);

    return res.status(200).json({
      success: true,
      deployment: {
        id: deployment.id,
        agentId: deployment.agent_id,
        userWallet: deployment.user_wallet,
        agentAddress: agentAddress,
        status: deployment.status,
      },
      message: existingDeployment ? 'Deployment updated' : 'Deployment created',
    });
  } catch (error: any) {
    console.error('[CreateDeployment] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  } finally {
    await prisma.$disconnect();
  }
}

