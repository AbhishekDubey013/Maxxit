/**
 * Wallet Pool Management
 * Generates new wallets on-demand for each user (no pool!)
 * Each user gets a unique agent wallet generated when needed
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { getAgentPrivateKeyByAddress } from './hyperliquid-user-wallet';

const prisma = new PrismaClient();

interface PoolWallet {
  id: string;
  address: string;
  private_key: string;
  assigned_to_user_wallet: string | null;
  created_at: Date | null;
}

/**
 * Assign an existing wallet from the pool to a user (Ostium flow).
 */
export async function assignWalletToUser(userWallet: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    const wallet = await prisma.wallet_pool.findFirst({
      where: { assigned_to_user_wallet: null },
    });

    if (!wallet) {
      console.error('[WalletPool] No available wallets in pool!');
      return null;
    }

    await prisma.wallet_pool.update({
      where: { id: wallet.id },
      data: {
        assigned_to_user_wallet: userWallet.toLowerCase(),
        created_at: new Date(),
      },
    });

    console.log(`[WalletPool] ✅ Assigned wallet ${wallet.address} to user ${userWallet}`);
    return { address: wallet.address, privateKey: wallet.private_key };
  } catch (error) {
    console.error('[WalletPool] Error assigning wallet:', error);
    return null;
  }
}

/**
 * Register a wallet in the pool (used by scripts/Ostium provisioning).
 */
export async function registerPrivateKey(
  address: string,
  privateKey: string,
  assignedToUserWallet?: string | null
) {
  await prisma.wallet_pool.upsert({
    where: { address: address.toLowerCase() },
    update: {
      private_key: privateKey,
      assigned_to_user_wallet: assignedToUserWallet ?? null,
    },
    create: {
      address: address.toLowerCase(),
      private_key: privateKey,
      assigned_to_user_wallet: assignedToUserWallet ?? null,
    },
  });
  console.log(`[WalletPool] Registered wallet ${address} (assigned=${assignedToUserWallet ?? 'none'})`);
}

/**
 * Get assigned wallet for a user
 */
export async function getAssignedWallet(userWallet: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    const wallet = await prisma.wallet_pool.findFirst({
      where: {
        assigned_to_user_wallet: {
          equals: userWallet.toLowerCase(),
          mode: 'insensitive',
        },
      },
    });

    if (!wallet) {
      return null;
    }

    return {
      address: wallet.address,
      privateKey: wallet.private_key,
    };
  } catch (error) {
    console.error('[WalletPool] Error getting assigned wallet:', error);
    return null;
  }
}

/**
 * Get private key for a specific agent address
 */
export async function getPrivateKeyForAddress(agentAddress: string): Promise<string | null> {
  const normalizedAddress = agentAddress.toLowerCase();

  // First, check Hyperliquid encrypted wallets
  try {
    const hyperKey = await getAgentPrivateKeyByAddress(normalizedAddress);
    if (hyperKey) {
      return hyperKey;
    }
  } catch (error) {
    console.error('[WalletPool] Error decrypting Hyperliquid agent key:', error);
    throw error;
  }

  // Fallback to legacy wallet_pool table (used by Ostium)
  try {
    const wallet = await prisma.wallet_pool.findFirst({
      where: {
        address: {
          equals: normalizedAddress,
          mode: 'insensitive',
        },
      },
      select: { private_key: true },
    });

    if (!wallet) {
      console.error(`[WalletPool] No wallet found for address ${agentAddress}`);
      return null;
    }

    return wallet.private_key;
  } catch (error) {
    console.error('[WalletPool] Error getting private key:', error);
    return null;
  }
}

/**
 * Release a wallet (make it available again)
 */
export async function releaseWallet(agentAddress: string): Promise<boolean> {
  try {
    await prisma.wallet_pool.updateMany({
      where: {
        address: {
          equals: agentAddress.toLowerCase(),
          mode: 'insensitive',
        },
      },
      data: {
        assigned_to_user_wallet: null,
        created_at: null,
      },
    });

    console.log(`[WalletPool] Released wallet ${agentAddress}`);
    return true;
  } catch (error) {
    console.error('[WalletPool] Error releasing wallet:', error);
    return false;
  }
}

/**
 * Get pool statistics
 */
export async function getPoolStats(): Promise<{ total: number; assigned: number; available: number }> {
  try {
    const total = await prisma.wallet_pool.count();
    const assigned = await prisma.wallet_pool.count({
      where: {
        assigned_to_user_wallet: { not: null },
      },
    });

    return {
      total,
      assigned,
      available: total - assigned,
    };
  } catch (error) {
    console.error('[WalletPool] Error getting stats:', error);
    return { total: 0, assigned: 0, available: 0 };
  }
}
