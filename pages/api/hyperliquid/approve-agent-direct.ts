/**
 * Approve Agent for Hyperliquid Trading (Direct with Private Key)
 * TESTNET ONLY - Never use on mainnet
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deploymentId, agentAddress, userPrivateKey } = req.body;

    if (!deploymentId || !agentAddress || !userPrivateKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: deploymentId, agentAddress, userPrivateKey' 
      });
    }

    // Verify testnet mode
    if (process.env.HYPERLIQUID_TESTNET !== 'true') {
      return res.status(403).json({ 
        error: 'This endpoint is only available in testnet mode' 
      });
    }

    // Get deployment
    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: deploymentId },
      include: { agents: true }
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Verify private key matches deployment wallet
    const wallet = new ethers.Wallet(userPrivateKey);
    if (wallet.address.toLowerCase() !== deployment.safe_wallet.toLowerCase()) {
      return res.status(400).json({ 
        error: 'Private key does not match deployment wallet address' 
      });
    }

    console.log('[HyperliquidApproval] Approving agent via Python service...');
    console.log(`  User: ${wallet.address}`);
    console.log(`  Agent: ${agentAddress}`);

    // Call Python service to approve agent
    const serviceUrl = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';
    const response = await fetch(`${serviceUrl}/approve-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrivateKey,
        agentAddress,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve agent');
    }

    const result = await response.json();

    console.log('[HyperliquidApproval] Agent approved successfully:', result);

    // Update deployment to mark agent as approved
    await prisma.agent_deployments.update({
      where: { id: deploymentId },
      data: {
        // You could add a field to track approval status
        module_enabled: true, // Ensure module is enabled
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Agent approved successfully',
      agentAddress,
      userAddress: wallet.address,
      result: result.result,
    });
  } catch (error: any) {
    console.error('[HyperliquidApproval] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to approve agent' 
    });
  }
}

