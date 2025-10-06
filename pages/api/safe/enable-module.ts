/**
 * Enable Module API
 * Proposes enableModule transaction to Safe Transaction Service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const SAFE_TX_SERVICE_URL = 'https://safe-transaction-sepolia.safe.global';

// Safe contract ABI (minimal - just what we need)
const SAFE_ABI = [
  'function isModuleEnabled(address module) external view returns (bool)',
  'function enableModule(address module) external',
  'function getModules() external view returns (address[])',
  'function nonce() external view returns (uint256)',
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

    // Check if module is already enabled
    let isEnabled = false;
    try {
      isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    } catch (error) {
      console.error('[EnableModule] Error checking module status:', error);
    }

    if (isEnabled) {
      return res.status(200).json({
        success: true,
        alreadyEnabled: true,
        message: 'Module is already enabled',
        moduleAddress: MODULE_ADDRESS,
      });
    }

    // Return complete transaction data including encoded module address
    
    // Generate enableModule transaction data (module address is encoded inside)
    const iface = new ethers.utils.Interface(SAFE_ABI);
    const txData = iface.encodeFunctionData('enableModule', [MODULE_ADDRESS]);

    // Get Safe nonce for frontend
    const nonce = await safe.nonce();

    console.log('[EnableModule] Transaction data prepared:', {
      to: safeAddress,
      data: txData,
      moduleAddress: MODULE_ADDRESS,
      dataDecoded: `enableModule(${MODULE_ADDRESS})`,
    });

    return res.status(200).json({
      success: true,
      alreadyEnabled: false,
      needsEnabling: true,
      transaction: {
        to: safeAddress,
        data: txData, // This includes the module address encoded
        value: '0',
      },
      nonce: nonce.toString(),
      safeAddress,
      moduleAddress: MODULE_ADDRESS, // For display purposes
      chainId: 11155111, // Sepolia
      message: 'Complete transaction data ready - just paste in Safe',
      // Helpful for debugging
      decoded: {
        function: 'enableModule',
        parameter: MODULE_ADDRESS,
      },
    });
  } catch (error: any) {
    console.error('[EnableModule] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to propose module enablement',
    });
  }
}
