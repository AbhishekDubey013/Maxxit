import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createExecutorAgreementSignature, verifyExecutorAgreementSignature, validateAutomatedAgentSignatureData } from '@lib/agent-automated-signing';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId, executorPrivateKey } = req.body;

    if (!signalId || !executorPrivateKey) {
      return res.status(400).json({ error: 'Signal ID and executor private key are required' });
    }

    // Find the signal
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: { agent: true }
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Create executor agreement signature
    const executorSignature = await createExecutorAgreementSignature(
      signal.id,
      signal.agentId,
      signal.tokenSymbol,
      signal.side,
      signal.sizeModel?.value?.toString() || '1',
      executorPrivateKey
    );

    // Verify the signature
    const isValid = verifyExecutorAgreementSignature(
      executorSignature.message,
      executorSignature.signature,
      executorSignature.agentWallet
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid executor agreement signature',
        isValid: false
      });
    }

    // Update the signal with executor agreement signature
    const updatedSignal = await prisma.signal.update({
      where: { id: signalId },
      data: {
        executorAgreementMessage: executorSignature.message,
        executorAgreementSignature: executorSignature.signature,
        executorAgreementTimestamp: executorSignature.timestamp,
        executorWallet: executorSignature.agentWallet,
        executorAgreementVerified: true,
        executorAgreementError: null
      }
    });

    // Log the executor agreement signature
    await prisma.auditLog.create({
      data: {
        action: 'EXECUTOR_AGREEMENT_SIGNATURE_CREATED',
        details: {
          signalId,
          agentId: signal.agentId,
          executorWallet: executorSignature.agentWallet,
          tokenSymbol: signal.tokenSymbol,
          side: signal.side,
          message: executorSignature.message,
          signature: executorSignature.signature,
          timestamp: executorSignature.timestamp,
          automated: true
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Executor agreement signature created and verified successfully',
      signal: {
        id: updatedSignal.id,
        executorAgreementVerified: updatedSignal.executorAgreementVerified,
        executorWallet: updatedSignal.executorWallet,
        executorAgreementTimestamp: updatedSignal.executorAgreementTimestamp
      }
    });

  } catch (error: any) {
    console.error('[AutomatedAgentSignature] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
