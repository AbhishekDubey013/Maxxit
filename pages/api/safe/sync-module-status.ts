import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';

const SAFE_ABI = [
  'function isModuleEnabled(address module) external view returns (bool)',
  'function getModules() external view returns (address[])',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { safeAddress } = req.body;

    if (!safeAddress || !ethers.utils.isAddress(safeAddress)) {
      return res.status(400).json({
        error: 'Invalid Safe address',
      });
    }

    console.log('[SyncModuleStatus] Checking module status for Safe:', safeAddress);

    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    
    // Check if Safe exists
    const code = await provider.getCode(safeAddress);
    if (code === '0x') {
      return res.status(400).json({
        error: 'Safe wallet not found on Sepolia',
        safeAddress,
      });
    }

    // Create Safe contract instance
    const safe = new ethers.Contract(safeAddress, SAFE_ABI, provider);

    // Check if module is enabled on-chain
    let isEnabledOnChain = false;
    try {
      isEnabledOnChain = await safe.isModuleEnabled(MODULE_ADDRESS);
    } catch (error) {
      console.error('[SyncModuleStatus] Error checking module status:', error);
      return res.status(500).json({
        error: 'Failed to check module status on-chain',
      });
    }

    console.log('[SyncModuleStatus] On-chain status:', isEnabledOnChain ? 'Enabled' : 'Disabled');

    // Find deployment in database
    const deployment = await prisma.agentDeployment.findFirst({
      where: { safeWallet: safeAddress },
      include: { agent: true },
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found for this Safe address',
        safeAddress,
        moduleEnabledOnChain: isEnabledOnChain,
      });
    }

    console.log('[SyncModuleStatus] Database status:', deployment.moduleEnabled ? 'Enabled' : 'Disabled');

    // Update database if status differs
    let updated = false;
    if (deployment.moduleEnabled !== isEnabledOnChain) {
      console.log('[SyncModuleStatus] Mismatch detected! Updating database...');
      
      await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: { moduleEnabled: isEnabledOnChain },
      });

      // Log the sync event
      await prisma.auditLog.create({
        data: {
          eventName: 'MODULE_STATUS_SYNCED',
          subjectType: 'AgentDeployment',
          subjectId: deployment.id,
          payload: {
            safeWallet: safeAddress,
            previousStatus: deployment.moduleEnabled,
            newStatus: isEnabledOnChain,
            syncedAt: new Date().toISOString(),
          },
        },
      });

      updated = true;
      console.log('[SyncModuleStatus] Database updated successfully');
    } else {
      console.log('[SyncModuleStatus] Database and blockchain already in sync');
    }

    return res.status(200).json({
      success: true,
      safeAddress,
      moduleEnabled: isEnabledOnChain,
      wasUpdated: updated,
      deployment: {
        id: deployment.id,
        agentName: deployment.agent.name,
        status: deployment.status,
      },
    });

  } catch (error: any) {
    console.error('[SyncModuleStatus] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to sync module status',
    });
  } finally {
    await prisma.$disconnect();
  }
}
