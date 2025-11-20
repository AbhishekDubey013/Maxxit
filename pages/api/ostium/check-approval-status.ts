/**
 * Check Ostium On-Chain Approval Status
 * 
 * Checks if user has actually approved USDC spending on-chain,
 * not just if they have an agent address.
 * 
 * This prevents the UI from skipping approval steps when approvals failed.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const USDC_ADDRESS = '0xe73B11Fb1e3eeEe8AF2a23079A4410Fe1B370548'; // Arbitrum Sepolia
const TRADING_CONTRACT = '0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe'; // Ostium Trading
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

const USDC_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userWallet } = req.query;

    if (!userWallet || typeof userWallet !== 'string') {
      return res.status(400).json({ error: 'User wallet required' });
    }

    const checksummedAddress = ethers.utils.getAddress(userWallet);

    // Connect to Arbitrum Sepolia
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

    // Check USDC allowance
    const allowance = await usdcContract.allowance(checksummedAddress, TRADING_CONTRACT);
    const allowanceUsdc = parseFloat(ethers.utils.formatUnits(allowance, 6));

    // Check USDC balance
    const balance = await usdcContract.balanceOf(checksummedAddress);
    const balanceUsdc = parseFloat(ethers.utils.formatUnits(balance, 6));

    // Minimum trade size on Ostium is $10
    const hasApproval = allowanceUsdc >= 10;
    const hasSufficientBalance = balanceUsdc >= 10;

    return res.status(200).json({
      success: true,
      userWallet: checksummedAddress,
      usdcBalance: balanceUsdc,
      usdcAllowance: allowanceUsdc,
      hasApproval,
      hasSufficientBalance,
      needsApproval: !hasApproval,
      tradingContract: TRADING_CONTRACT,
    });
  } catch (error: any) {
    console.error('[CheckApprovalStatus] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check approval status',
    });
  }
}

