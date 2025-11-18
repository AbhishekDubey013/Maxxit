import { PrismaClient } from '@prisma/client';
import {
  getOrCreateOstiumWallet,
  getOstiumPrivateKeyByAddress,
} from './ostium-user-wallet';

const prisma = new PrismaClient();

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

async function determineEnabledVenues(agentId: string): Promise<string[]> {
  const agent = await prisma.agents.findUnique({
    where: { id: agentId },
    select: { venue: true },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.venue === 'MULTI') {
    return ['HYPERLIQUID', 'OSTIUM'];
  }

  return ['OSTIUM'];
}

export async function ensureOstiumDeployment(agentId: string, userWallet: string) {
  const normalizedWallet = normalizeAddress(userWallet);
  const walletRecord = await getOrCreateOstiumWallet(userWallet);

  let deployment = (await prisma.agent_deployments.findFirst({
    where: {
      agent_id: agentId,
      user_wallet: {
        equals: normalizedWallet,
        mode: 'insensitive',
      },
    },
  })) as any;

  if (!deployment) {
    const enabledVenues = await determineEnabledVenues(agentId);

    const createData = {
      agent_id: agentId,
      user_wallet: normalizedWallet,
      safe_wallet: userWallet,
      status: 'ACTIVE',
      module_enabled: true,
      enabled_venues: enabledVenues,
      ostium_agent_address: walletRecord.agent_address,
      ostium_agent_key_encrypted: walletRecord.agent_private_key_encrypted,
      ostium_agent_key_iv: walletRecord.agent_key_iv,
      ostium_agent_key_tag: walletRecord.agent_key_tag,
    } as any;

    deployment = await prisma.agent_deployments.create({
      data: createData,
    });

    return deployment;
  }

  const needsUpdate =
    deployment.ostium_agent_address?.toLowerCase() !== walletRecord.agent_address.toLowerCase() ||
    !deployment.ostium_agent_key_encrypted;

  if (needsUpdate) {
    const updateData = {
      ostium_agent_address: walletRecord.agent_address,
      ostium_agent_key_encrypted: walletRecord.agent_private_key_encrypted,
      ostium_agent_key_iv: walletRecord.agent_key_iv,
      ostium_agent_key_tag: walletRecord.agent_key_tag,
    } as any;

    deployment = await prisma.agent_deployments.update({
      where: { id: deployment.id },
      data: updateData,
    });
  }

  return deployment;
}

export async function getOstiumAgentPrivateKey(agentAddress: string): Promise<string | null> {
  return getOstiumPrivateKeyByAddress(agentAddress);
}

