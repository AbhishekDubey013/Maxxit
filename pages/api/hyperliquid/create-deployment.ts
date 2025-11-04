/**
 * Create or update deployment for Hyperliquid agent
 * Called when user approves agent on Hyperliquid
 */

import { NextApiRequest, NextApiResponse } from 'next';
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
        error: 'Missing required fields: agentId, userWallet, agentAddress' 
      });
    }

    console.log('[CreateDeployment] Creating deployment:', {
      agentId,
      userWallet,
      agentAddress,
    });

    // Check if agent exists
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

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
        data: {
          safe_wallet: userWallet.toLowerCase(),
          hyperliquid_agent_address: agentAddress,
          status: 'ACTIVE',
          sub_active: true,
        },
      });
    } else {
      // Create new deployment
      console.log('[CreateDeployment] Creating new deployment');
      deployment = await prisma.agent_deployments.create({
        data: {
          agent_id: agentId,
          user_wallet: userWallet.toLowerCase(),
          safe_wallet: userWallet.toLowerCase(),
          hyperliquid_agent_address: agentAddress,
          status: 'ACTIVE',
          sub_active: true,
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
        agentAddress: deployment.hyperliquid_agent_address,
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

