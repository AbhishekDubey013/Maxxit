/**
 * Create or update deployment for Ostium agent
 * 
 * New Flow:
 * 1. User calls /api/agents/[id]/generate-deployment-address to get unique address
 * 2. User delegates the address on Ostium
 * 3. User calls this API with encrypted key data to create deployment
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      agentId, 
      userWallet, 
      agentAddress,
      encryptedKey,
      keyIv,
      keyTag,
    } = req.body;

    if (!agentId || !userWallet || !agentAddress || !encryptedKey || !keyIv || !keyTag) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, userWallet, agentAddress, encryptedKey, keyIv, keyTag',
      });
    }

    console.log('[Ostium Create Deployment] Creating deployment:', {
      agentId,
      userWallet,
      agentAddress,
    });

    // Get agent to check venue
    const agent = await prisma.agents.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if this agent address is already used by another deployment
    const existingAddressDeployment = await prisma.agent_deployments.findFirst({
      where: {
        ostium_agent_address: agentAddress,
      },
    });

    if (existingAddressDeployment) {
      console.error('[Ostium Create Deployment] Agent address already in use by deployment:', existingAddressDeployment.id);
      return res.status(400).json({ 
        error: 'This agent address is already in use. Please generate a new address.' 
      });
    }

    // Vprime: For MULTI venue agents, enable both Hyperliquid and Ostium
    // For single-venue agents, only enable that venue
    const enabledVenues = agent.venue === 'MULTI' 
      ? ['HYPERLIQUID', 'OSTIUM'] 
      : ['OSTIUM'];

    const deploymentData = {
      safe_wallet: userWallet.toLowerCase(),
      ostium_agent_address: agentAddress,
      ostium_agent_key_encrypted: encryptedKey,
      ostium_agent_key_iv: keyIv,
      ostium_agent_key_tag: keyTag,
      enabled_venues: enabledVenues, // Vprime: Agent Where routing
      status: 'ACTIVE' as const,
      sub_active: true,
      module_enabled: true, // Ostium doesn't need Safe module
    };

    // Check if deployment already exists for this agent and user
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: {
        agent_id: agentId,
        user_wallet: userWallet.toLowerCase(),
      },
    });

    let deployment;

    if (existingDeployment) {
      // Update existing deployment
      console.log('[Ostium Create Deployment] Updating existing deployment:', existingDeployment.id);
      deployment = await prisma.agent_deployments.update({
        where: { id: existingDeployment.id },
        data: deploymentData,
      });
    } else {
      // Create new deployment
      console.log('[Ostium Create Deployment] Creating new deployment');
      deployment = await prisma.agent_deployments.create({
        data: {
          agent_id: agentId,
          user_wallet: userWallet.toLowerCase(),
          ...deploymentData,
        },
      });
    }

    console.log('[Ostium Create Deployment] ✅ Deployment created/updated:', deployment.id);

    return res.status(200).json({
      success: true,
      deployment: {
        id: deployment.id,
        agentId: deployment.agent_id,
        userWallet: deployment.user_wallet,
        agentAddress: deployment.ostium_agent_address,
        status: deployment.status,
      },
      message: existingDeployment ? 'Deployment updated' : 'Deployment created',
    });
  } catch (error: any) {
    console.error('[Ostium Create Deployment API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create deployment',
    });
  } finally {
    await prisma.$disconnect();
  }
}

