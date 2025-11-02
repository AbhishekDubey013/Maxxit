/**
 * Build transaction to bridge USDC from Arbitrum to Hyperliquid
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const HL_BRIDGE = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7'; // Hyperliquid Bridge on Arbitrum
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC on Arbitrum

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { safeAddress, amount, destination } = req.body;

    if (!safeAddress || !amount || !destination) {
      return res.status(400).json({ 
        error: 'Missing required fields: safeAddress, amount, destination' 
      });
    }

    // Parse amount (expected in USDC, 6 decimals)
    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);

    // Build bridge transaction
    const bridgeInterface = new ethers.utils.Interface([
      'function bridgeIn(address token, uint256 amount, address destination) external',
    ]);

    const bridgeData = bridgeInterface.encodeFunctionData('bridgeIn', [
      USDC,
      amountWei,
      destination,
    ]);

    // Build approval transaction for USDC
    const erc20Interface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ]);

    const approveData = erc20Interface.encodeFunctionData('approve', [
      HL_BRIDGE,
      amountWei,
    ]);

    // Check if approval is needed
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );
    
    const usdc = new ethers.Contract(USDC, [
      'function allowance(address owner, address spender) view returns (uint256)'
    ], provider);
    
    const currentAllowance = await usdc.allowance(safeAddress, HL_BRIDGE);
    const needsApproval = currentAllowance.lt(amountWei);

    const transactions = [];

    if (needsApproval) {
      transactions.push({
        to: USDC,
        value: '0',
        data: approveData,
        operation: 0,
      });
    }

    transactions.push({
      to: HL_BRIDGE,
      value: '0',
      data: bridgeData,
      operation: 0,
    });

    return res.status(200).json({
      success: true,
      transactions,
      needsApproval,
      amount: amount.toString(),
      destination,
      message: `Bridge ${amount} USDC to Hyperliquid (destination: ${destination})`
    });
  } catch (error: any) {
    console.error('[HyperliquidBridge] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to build bridge transaction' 
    });
  }
}

