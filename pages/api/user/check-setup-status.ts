/**
 * Check User Setup Status
 * 
 * Checks if user has already completed initial setup:
 * - Has agent addresses (Hyperliquid/Ostium)
 * - Has trading preferences
 * 
 * Used by frontend to skip setup steps for subsequent agent deployments
 * 
 * Run: GET /api/user/check-setup-status?userWallet=0x...
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userWallet } = req.query;

    if (!userWallet || typeof userWallet !== 'string') {
      return res.status(400).json({ error: 'User wallet required' });
    }

    const normalizedWallet = userWallet.toLowerCase();

    // Check for agent addresses
    const userAddress = await prisma.user_agent_addresses.findUnique({
      where: { user_wallet: normalizedWallet },
      select: {
        hyperliquid_agent_address: true,
        ostium_agent_address: true,
        last_used_at: true,
      },
    });

    // Check for trading preferences
    const preferences = await prisma.user_trading_preferences.findUnique({
      where: { user_wallet: normalizedWallet },
      select: {
        id: true,
        risk_tolerance: true,
        trade_frequency: true,
      },
    });

    const hasHyperliquidAddress = !!(userAddress?.hyperliquid_agent_address);
    const hasOstiumAddress = !!(userAddress?.ostium_agent_address);
    const hasPreferences = !!preferences;
    const hasAnyAddress = hasHyperliquidAddress || hasOstiumAddress;

    // User has completed setup if they have at least one address
    const setupComplete = hasAnyAddress;

    return res.status(200).json({
      success: true,
      setupComplete,
      hasHyperliquidAddress,
      hasOstiumAddress,
      hasPreferences,
      addresses: {
        hyperliquid: userAddress?.hyperliquid_agent_address || null,
        ostium: userAddress?.ostium_agent_address || null,
      },
      message: setupComplete
        ? 'User has completed setup'
        : 'User needs to complete initial setup',
    });
  } catch (error: any) {
    console.error('[CheckSetupStatus] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to check setup status',
    });
  } finally {
    await prisma.$disconnect();
  }
}

