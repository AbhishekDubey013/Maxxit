/**
 * Approve Agent for Hyperliquid Trading (via Web3 Signature)
 * User signs approval with MetaMask/Web3 wallet
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
    const { deploymentId, agentAddress, userAddress, signature, message } = req.body;

    if (!deploymentId || !agentAddress || !userAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: deploymentId, agentAddress, userAddress, signature, message' 
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

    // Verify signature matches user address
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(400).json({ 
        error: 'Invalid signature' 
      });
    }

    // Verify user address matches deployment wallet
    if (userAddress.toLowerCase() !== deployment.safe_wallet.toLowerCase()) {
      return res.status(400).json({ 
        error: 'User address does not match deployment wallet' 
      });
    }

    console.log('[HyperliquidApproval] User signature verified');
    console.log(`  User: ${userAddress}`);
    console.log(`  Agent: ${agentAddress}`);
    console.log(`  Message: ${message}`);

    // For now, we store the approval in database
    // In production, you would call Hyperliquid API to actually approve
    // But that requires the user's private key, which we don't have with Web3 signing
    
    // Alternative: Store approval intent and instruct user to approve on Hyperliquid UI
    // Or: Have user sign the actual Hyperliquid approval transaction

    console.log('[HyperliquidApproval] ⚠️  Note: Signature verified, but actual Hyperliquid approval');
    console.log('  requires either:');
    console.log('  1. User approves directly on Hyperliquid UI');
    console.log('  2. User provides private key (testnet only)');
    console.log('  3. Implement EIP-712 structured signing for Hyperliquid');

    // Update deployment to mark approval intent
    await prisma.agent_deployments.update({
      where: { id: deploymentId },
      data: {
        module_enabled: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Approval signature verified. Please complete approval on Hyperliquid.',
      agentAddress,
      userAddress,
      nextSteps: [
        'Go to https://app.hyperliquid-testnet.xyz',
        'Connect your wallet',
        'Navigate to Settings → Agent Wallets',
        `Add agent address: ${agentAddress}`,
        'Sign the approval transaction'
      ]
    });
  } catch (error: any) {
    console.error('[HyperliquidApproval] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to verify approval' 
    });
  }
}

