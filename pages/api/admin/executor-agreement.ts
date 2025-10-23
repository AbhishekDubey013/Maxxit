import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyExecutorAgreement, validateExecutorAgreementData } from '@lib/executor-agreement';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId, executorAgreement } = req.body;

    if (!signalId || !executorAgreement) {
      return res.status(400).json({ error: 'Signal ID and executor agreement are required' });
    }

    // Validate executor agreement data
    if (!validateExecutorAgreementData(executorAgreement)) {
      return res.status(400).json({ error: 'Invalid executor agreement data structure' });
    }

    // Find the signal
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: { agent: true }
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Verify the executor agreement signature
    const isValid = verifyExecutorAgreement(
      executorAgreement.message,
      executorAgreement.signature,
      executorAgreement.executorWallet
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid executor agreement signature',
        isValid: false
      });
    }

    // Update the signal with executor agreement
    const updatedSignal = await prisma.signal.update({
      where: { id: signalId },
      data: {
        executorAgreementMessage: executorAgreement.message,
        executorAgreementSignature: executorAgreement.signature,
        executorAgreementTimestamp: executorAgreement.timestamp,
        executorWallet: executorAgreement.executorWallet,
        executorAgreementVerified: true,
        executorAgreementError: null
      }
    });

    // Log the executor agreement
    await prisma.auditLog.create({
      data: {
        action: 'EXECUTOR_AGREEMENT_SIGNED',
        details: {
          signalId,
          agentId: signal.agentId,
          executorWallet: executorAgreement.executorWallet,
          tokenSymbol: signal.tokenSymbol,
          side: signal.side,
          message: executorAgreement.message,
          signature: executorAgreement.signature,
          timestamp: executorAgreement.timestamp
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Executor agreement signed and verified successfully',
      signal: {
        id: updatedSignal.id,
        executorAgreementVerified: updatedSignal.executorAgreementVerified,
        executorWallet: updatedSignal.executorWallet,
        executorAgreementTimestamp: updatedSignal.executorAgreementTimestamp
      }
    });

  } catch (error: any) {
    console.error('[ExecutorAgreement] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
