import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ExecutorAgreementService } from '@lib/executor-agreement-service';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signals = await ExecutorAgreementService.getSignalsNeedingExecutorAgreement();

    return res.status(200).json({
      success: true,
      signals,
      count: signals.length
    });

  } catch (error: any) {
    console.error('[SignalsNeedingExecutorAgreement] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
