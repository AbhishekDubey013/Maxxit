import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { insertAgentDeploymentSchema } from '@shared/schema';
import { z } from 'zod';
import { relayerService } from '../../../lib/relayer';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[API /deployments] Error:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { agentId, userWallet } = req.query;

  // Build where clause with case-insensitive wallet matching
  const where: any = {};
  if (agentId) where.agentId = agentId;
  
  // Case-insensitive wallet matching (Ethereum addresses can be checksummed)
  if (userWallet) {
    where.userWallet = {
      equals: userWallet as string,
      mode: 'insensitive'
    };
  }

  const deployments = await prisma.agentDeployment.findMany({
    where,
    include: {
      agent: true,
      telegramUsers: {
        where: { isActive: true }
      }
    },
    orderBy: {
      subStartedAt: 'desc',
    },
  });

  // Add telegramLinked flag to response
  const deploymentsWithTelegram = deployments.map(d => ({
    ...d,
    telegramLinked: d.telegramUsers.length > 0
  }));

  return res.status(200).json(deploymentsWithTelegram);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validated = insertAgentDeploymentSchema.parse(req.body);

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: validated.agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if agent is ACTIVE
    if (agent.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Agent must be ACTIVE to deploy' });
    }

    // Check if already deployed by this user
    const existing = await prisma.agentDeployment.findUnique({
      where: {
        userWallet_agentId: {
          userWallet: validated.userWallet,
          agentId: validated.agentId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Agent already deployed by this user' });
    }

    // Install module on Safe wallet (stub)
    const moduleResult = await relayerService.installModule(validated.safeWallet);
    
    // Create deployment
    const deployment = await prisma.agentDeployment.create({
      data: {
        ...validated,
        status: 'ACTIVE',
        subActive: true,
      },
      include: {
        agent: true,
      },
    });

    // Log module installation to audit
    await prisma.auditLog.create({
      data: {
        eventName: 'MODULE_INSTALLED',
        subjectType: 'AgentDeployment',
        subjectId: deployment.id,
        payload: {
          safeWallet: validated.safeWallet,
          txHash: moduleResult.txHash,
        },
      },
    });

    return res.status(201).json(deployment);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors,
      });
    }
    throw error;
  }
}
