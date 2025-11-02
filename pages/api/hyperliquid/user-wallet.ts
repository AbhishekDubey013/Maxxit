/**
 * Hyperliquid User Wallet API
 * Manages one agent wallet per user
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserAgentWallet } from '../../../lib/hyperliquid-user-wallet';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check encryption key is configured
    if (!process.env.AGENT_WALLET_ENCRYPTION_KEY) {
      return res.status(500).json({
        error: 'Hyperliquid wallet service not configured. AGENT_WALLET_ENCRYPTION_KEY missing.',
      });
    }

    // GET - Retrieve user's agent wallet
    if (req.method === 'GET') {
      const { userAddress } = req.query;

      if (!userAddress || typeof userAddress !== 'string') {
        return res.status(400).json({ error: 'userAddress query param required' });
      }

      const userWallet = await prisma.user_hyperliquid_wallets.findUnique({
        where: { user_wallet: userAddress.toLowerCase() },
      });

      if (!userWallet) {
        return res.status(404).json({ error: 'No agent wallet found for this user' });
      }

      return res.status(200).json({
        agentAddress: userWallet.agent_address,
        isApproved: userWallet.is_approved || false,
        createdAt: userWallet.created_at,
        lastUsedAt: userWallet.last_used_at,
      });
    }

    // POST - Create or get user's agent wallet
    if (req.method === 'POST') {
      const { userAddress } = req.body;

      if (!userAddress) {
        return res.status(400).json({ error: 'userAddress required' });
      }

      const agentAddress = await getUserAgentWallet(userAddress.toLowerCase());
      
      const userWallet = await prisma.user_hyperliquid_wallets.findUnique({
        where: { user_wallet: userAddress.toLowerCase() },
      });

      if (!userWallet) {
        return res.status(500).json({ error: 'Failed to create wallet' });
      }

      return res.status(200).json({
        agentAddress: userWallet.agent_address,
        isApproved: userWallet.is_approved || false,
        createdAt: userWallet.created_at,
      });
    }

    // PATCH - Update approval status
    if (req.method === 'PATCH') {
      const { userAddress, isApproved } = req.body;

      if (!userAddress) {
        return res.status(400).json({ error: 'userAddress required' });
      }

      const userWallet = await prisma.user_hyperliquid_wallets.update({
        where: { user_wallet: userAddress.toLowerCase() },
        data: { is_approved: isApproved },
      });

      return res.status(200).json({
        agentAddress: userWallet.agent_address,
        isApproved: userWallet.is_approved,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[HyperliquidUserWallet] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

