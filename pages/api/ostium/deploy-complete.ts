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
           // User needs to sign this transaction via MetaMask/Privy
           console.log(`[Ostium Deploy] Agent ${agentAddress} assigned to user ${userWallet}`);
           console.log(`[Ostium Deploy] User must approve agent via UI (sign transaction with wallet)`);
           
           // Return deployment with pending approval status

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

