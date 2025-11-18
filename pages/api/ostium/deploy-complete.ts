import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureOstiumDeployment } from '../../../lib/ostium-agent-wallet';

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

    const deployment = await ensureOstiumDeployment(agentId, userWallet);
    const agentAddress = deployment.ostium_agent_address;

    if (!agentAddress) {
      throw new Error('Failed to generate Ostium agent address');
    }

    console.log(`[Ostium Deploy] Agent ${agentAddress} assigned to user ${userWallet}`);
    console.log('[Ostium Deploy] User must approve agent via UI (sign transaction with wallet)');

    return res.status(200).json({
      success: true,
      deploymentId: deployment.id,
      agentAddress,
      userWallet,
      message: 'Ostium agent assigned - approval needed',
      needsApproval: true,
      approvalNote: 'User must sign approval transaction to allow agent to trade on their behalf',
    });
  } catch (error: any) {
    console.error('[Ostium Deploy Complete] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to deploy Ostium agent',
    });
  }
}

