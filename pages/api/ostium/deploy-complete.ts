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

    // 1. Check if user already has ANY deployment with an agent wallet
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: {
        safe_wallet: {
          equals: userWallet,
          mode: 'insensitive',
        },
        hyperliquid_agent_address: { not: null },
      },
      select: {
        hyperliquid_agent_address: true,
      },
    });

    let agentAddress: string;

    if (existingDeployment?.hyperliquid_agent_address) {
      // Reuse existing agent wallet
      agentAddress = existingDeployment.hyperliquid_agent_address;
      console.log(`[Ostium Deploy] Reusing existing agent wallet: ${agentAddress}`);
    } else {
      // Try to assign from pool
      const agentWallet = await assignWalletToUser(userWallet);
      
      if (!agentWallet) {
        return res.status(500).json({ 
          error: 'No available agent wallets. Please deploy a Hyperliquid agent first or contact support.' 
        });
      }

      agentAddress = agentWallet.address;
      console.log(`[Ostium Deploy] Assigned new agent wallet: ${agentAddress}`);
    }

    // 2. Create deployment in database
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agentId,
        user_wallet: userWallet,
        safe_wallet: userWallet,
        hyperliquid_agent_address: agentAddress,
        status: 'ACTIVE',
        module_enabled: true,
      },
    });

    console.log(`[Ostium Deploy] Created deployment: ${deployment.id}`);

    // 3. Approve agent on Ostium smart contracts
    console.log(`[Ostium Deploy] Approving agent ${agentAddress} for user ${userWallet}...`);
    
    try {
      // Get user's private key to sign approval
      // In production, this should be done via wallet connection on frontend
      // For now, we'll skip and let user approve manually or via UI
      console.log(`[Ostium Deploy] ⚠️  Agent approval pending - user must approve via UI`);
    } catch (approvalError: any) {
      console.error(`[Ostium Deploy] Approval failed:`, approvalError);
      // Don't fail the deployment, just warn
    }

    return res.status(200).json({
      success: true,
      deploymentId: deployment.id,
      agentAddress,
      userWallet,
      message: 'Ostium agent deployed successfully',
      needsApproval: true,
      approvalNote: 'Agent needs to be approved on Ostium smart contracts before trading',
    });
  } catch (error: any) {
    console.error('[Ostium Deploy Complete] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to deploy Ostium agent',
    });
  }
}

