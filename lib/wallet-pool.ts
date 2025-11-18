import { PrismaClient } from '@prisma/client';
import { getAgentPrivateKeyByAddress } from './hyperliquid-user-wallet';
import { getOstiumPrivateKeyByAddress } from './ostium-user-wallet';

const prisma = new PrismaClient();

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

  // Next, check Ostium encrypted wallets
  try {
    const ostiumKey = await getOstiumPrivateKeyByAddress(normalizedAddress);
    if (ostiumKey) {
      return ostiumKey;
    }
  } catch (error) {
    console.error('[WalletPool] Error decrypting Ostium agent key:', error);
    throw error;
  }

  // Fallback to legacy wallet_pool table (used by Ostium)
  try {
    const wallet = await prisma.wallet_pool.findFirst({
      where: {
        address: {
          equals: agentAddress.toLowerCase(),
          mode: 'insensitive',
        },
      },
      select: {
        private_key: true,
      },
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

