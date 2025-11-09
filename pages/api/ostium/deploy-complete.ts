import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server';
import { assignWalletToUser } from '../../../lib/wallet-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet } = req.body;

    if (!agentId || !userWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Assign agent wallet from pool to user
    const agentWallet = await assignWalletToUser(userWallet);
    
    if (!agentWallet) {
      return res.status(500).json({ error: 'No available agent wallets in pool' });
    }

    console.log(`[Ostium Deploy] Assigned agent wallet: ${agentWallet.address} to user: ${userWallet}`);

    // 2. Create deployment in database
    const deployment = await prisma.agent_deployments.create({
      data: {
        agentId,
        safeWallet: userWallet, // User's Arbitrum wallet
        hyperliquidAgentAddress: agentWallet.address, // TODO: Add ostium_agent_address column
        status: 'ACTIVE',
        moduleEnabled: true,
      },
    });

    console.log(`[Ostium Deploy] Created deployment: ${deployment.id}`);

    return res.status(200).json({
      success: true,
      deploymentId: deployment.id,
      agentAddress: agentWallet.address,
      userWallet,
      message: 'Ostium agent deployed successfully - Agent wallet assigned from pool',
    });
  } catch (error: any) {
    console.error('[Ostium Deploy Complete] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to deploy Ostium agent',
    });
  }
}

