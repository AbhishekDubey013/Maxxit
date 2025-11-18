import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { agentWalletCrypto } from './hyperliquid-user-wallet';

const prisma = new PrismaClient() as any;

function normalize(address: string): string {
  return address.toLowerCase();
}

export async function findUserOstiumWallet(userWallet: string) {
  return prisma.user_ostium_wallets.findUnique({
    where: { user_wallet: normalize(userWallet) },
  });
}

export async function getOrCreateOstiumWallet(userWallet: string) {
  const normalized = normalize(userWallet);
  let record = await findUserOstiumWallet(normalized);

  if (!record) {
    const wallet = ethers.Wallet.createRandom();
    const encrypted = agentWalletCrypto.encrypt(wallet.privateKey);

    record = await prisma.user_ostium_wallets.create({
      data: {
        user_wallet: normalized,
        agent_address: wallet.address,
        agent_private_key_encrypted: encrypted.cipherText,
        agent_key_iv: encrypted.iv,
        agent_key_tag: encrypted.tag,
      },
    });
  }

  return record;
}

export async function updateOstiumWalletDelegationStatus(userWallet: string, isDelegated: boolean) {
  await prisma.user_ostium_wallets.update({
    where: { user_wallet: normalize(userWallet) },
    data: {
      is_delegated: isDelegated,
      last_used_at: new Date(),
    },
  });
}

export async function getOstiumPrivateKeyByAddress(agentAddress: string): Promise<string | null> {
  const record = await prisma.user_ostium_wallets.findFirst({
    where: { agent_address: normalize(agentAddress) },
  });

  if (!record) {
    return null;
  }

  return agentWalletCrypto.decrypt(
    record.agent_private_key_encrypted,
    record.agent_key_iv,
    record.agent_key_tag
  );
}

export async function deleteOstiumWallet(userWallet: string) {
  await prisma.user_ostium_wallets.deleteMany({
    where: { user_wallet: normalize(userWallet) },
  });
}

