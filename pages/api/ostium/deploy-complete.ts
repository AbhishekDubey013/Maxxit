import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server';
import { getPrivateKeyForAddress, generateAgentWallet } from '../../../lib/wallet-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet } = req.body;

    if (!agentId || !userWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Generate agent wallet
    const agentWallet = await generateAgentWallet();
    console.log(`[Ostium Deploy] Generated agent wallet: ${agentWallet}`);

    // 2. Approve agent on Ostium smart contract (user signs)
    // For now, we'll skip this approval step as it requires user interaction
    // The agent will be approved when first trade is attempted

    // 3. Create deployment in database
    const deployment = await prisma.agent_deployments.create({
      data: {
        agentId,
        safeWallet: userWallet, // User's Arbitrum wallet
        hyperliquidAgentAddress: agentWallet, // TODO: Add ostium_agent_address column
        status: 'ACTIVE',
        moduleEnabled: true,
      },
    });

    console.log(`[Ostium Deploy] Created deployment: ${deployment.id}`);

    return res.status(200).json({
      success: true,
      deploymentId: deployment.id,
      agentAddress: agentWallet,
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

