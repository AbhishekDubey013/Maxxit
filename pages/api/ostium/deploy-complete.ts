import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { assignWalletToUser } from '../../../lib/wallet-pool';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet } = req.body;

    if (!agentId || !userWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Ostium Deploy] Starting deployment for agent: ${agentId}, user: ${userWallet}`);

    // 1. Assign agent wallet from pool
    const agentWallet = await assignWalletToUser(userWallet);
    
    if (!agentWallet) {
      return res.status(500).json({ error: 'No available agent wallets in pool. Please contact support.' });
    }

    const agentAddress = agentWallet.address;
    console.log(`[Ostium Deploy] Assigned agent wallet: ${agentAddress} to user: ${userWallet}`);

    // 2. Create deployment in database
    const deployment = await prisma.agent_deployments.create({
      data: {
        agentId,
        safeWallet: userWallet,
        hyperliquidAgentAddress: agentAddress,
        status: 'ACTIVE',
        moduleEnabled: true,
      },
    });

    console.log(`[Ostium Deploy] Created deployment: ${deployment.id}`);

    return res.status(200).json({
      success: true,
      deploymentId: deployment.id,
      agentAddress,
      userWallet,
      message: 'Ostium agent deployed successfully',
    });
  } catch (error: any) {
    console.error('[Ostium Deploy Complete] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to deploy Ostium agent',
    });
  }
}

