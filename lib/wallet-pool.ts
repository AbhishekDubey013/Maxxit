/**
 * Wallet Pool Management
 * Pre-generated wallets with plaintext private keys (no encryption!)
 * Simple and fast - assign wallet from pool to user
 * 
 * FIXED: Updated to use correct schema field names (assigned_to_user_wallet)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PoolWallet {
  id: string;
  address: string;
  private_key: string;
  assigned_to_user_wallet: string | null;
  created_at: Date | null;
}

/**
 * Get an unassigned wallet from the pool and assign it to a user
 */
export async function assignWalletToUser(userWallet: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    // Find first unassigned wallet
    const result = await prisma.$queryRaw<PoolWallet[]>`
      SELECT * FROM wallet_pool 
      WHERE assigned_to_user_wallet IS NULL
      LIMIT 1
    `;

    if (result.length === 0) {
      console.error('[WalletPool] No available wallets in pool!');
      return null;
    }

    const wallet = result[0];

    // Mark as assigned
    await prisma.$executeRaw`
      UPDATE wallet_pool 
      SET assigned_to_user_wallet = ${userWallet.toLowerCase()}
      WHERE id = ${wallet.id}
    `;

    console.log(`[WalletPool] Assigned wallet ${wallet.address} to user ${userWallet}`);

    return {
      address: wallet.address,
      privateKey: wallet.private_key,
    };
  } catch (error) {
    console.error('[WalletPool] Error assigning wallet:', error);
    return null;
  }
}

/**
 * Get assigned wallet for a user
 */
export async function getAssignedWallet(userWallet: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    const result = await prisma.$queryRaw<PoolWallet[]>`
      SELECT * FROM wallet_pool 
      WHERE LOWER(assigned_to_user_wallet) = LOWER(${userWallet})
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const wallet = result[0];
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
  try {
    const result = await prisma.$queryRaw<PoolWallet[]>`
      SELECT private_key FROM wallet_pool 
      WHERE LOWER(address) = LOWER(${agentAddress})
      LIMIT 1
    `;

    if (result.length === 0) {
      console.error(`[WalletPool] No wallet found for address ${agentAddress}`);
      return null;
    }

    return result[0].private_key;
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
    await prisma.$executeRaw`
      UPDATE wallet_pool 
      SET assigned_to_user_wallet = NULL
      WHERE LOWER(address) = LOWER(${agentAddress})
    `;

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
    const total = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM wallet_pool
    `;

    const assigned = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM wallet_pool WHERE assigned_to_user_wallet IS NOT NULL
    `;

    return {
      total: Number(total[0].count),
      assigned: Number(assigned[0].count),
      available: Number(total[0].count) - Number(assigned[0].count),
    };
  } catch (error) {
    console.error('[WalletPool] Error getting stats:', error);
    return { total: 0, assigned: 0, available: 0 };
  }
}
