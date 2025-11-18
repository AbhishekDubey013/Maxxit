import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureOstiumDeployment } from '../../../lib/ostium-agent-wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, userWallet } = req.body;

    if (!agentId || !userWallet) {
      return res.status(400).json({ error: 'agentId and userWallet are required' });
    }

    const deployment = await ensureOstiumDeployment(agentId, userWallet);

    return res.status(200).json({
      success: true,
      agentAddress: deployment.ostium_agent_address,
      deploymentId: deployment.id,
    });
  } catch (error: any) {
    console.error('[Ostium Generate Agent API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate agent wallet',
    });
  }
}

