import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { AutomatedAgentSigningService } from '@lib/automated-agent-signing-service';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signals = await AutomatedAgentSigningService.getSignalsNeedingAutomatedSignatures();

    return res.status(200).json({
      success: true,
      signals,
      count: signals.length
    });

  } catch (error: any) {
    console.error('[SignalsNeedingAutomatedSignatures] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
