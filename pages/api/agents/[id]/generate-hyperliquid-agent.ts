import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserAgentWallet } from '../../../../lib/hyperliquid-user-wallet';

const prisma = new PrismaClient();

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

    const agentAddress = await getUserAgentWallet(deployment.user_wallet);

    await prisma.agent_deployments.update({
      where: { id: deploymentId },
      data: {
        hyperliquid_agent_address: agentAddress,
        // No encrypted key fields needed!
      }
    });

    console.log(`[HyperliquidAgent] Generated wallet ${agentAddress} for deployment ${deploymentId}`);

    return res.status(200).json({
      agentAddress,
      alreadyExists: false
    });
  } catch (error: any) {
    console.error(`[HyperliquidAgent] Error generating wallet:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

