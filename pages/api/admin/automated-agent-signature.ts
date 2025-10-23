import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createAutomatedAgentSignature, verifyAutomatedAgentSignature, validateAutomatedAgentSignatureData } from '@lib/agent-automated-signing';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId, agentPrivateKey } = req.body;

    if (!signalId || !agentPrivateKey) {
      return res.status(400).json({ error: 'Signal ID and agent private key are required' });
    }

    // Find the signal
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: { agent: true }
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Create automated agent signature
    const agentSignature = await createAutomatedAgentSignature(
      signal.id,
      signal.agentId,
      signal.tokenSymbol,
      signal.side,
      signal.sizeModel?.value?.toString() || '1',
      agentPrivateKey
    );

    // Verify the signature
    const isValid = verifyAutomatedAgentSignature(
      agentSignature.message,
      agentSignature.signature,
      agentSignature.agentWallet
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid automated agent signature',
        isValid: false
      });
    }

    // Update the signal with automated agent signature
    const updatedSignal = await prisma.signal.update({
      where: { id: signalId },
      data: {
        agentSignatureMessage: agentSignature.message,
        agentSignature: agentSignature.signature,
        agentSignatureTimestamp: agentSignature.timestamp,
        agentWallet: agentSignature.agentWallet,
        agentSignatureVerified: true,
        agentSignatureError: null
      }
    });

    // Log the automated agent signature
    await prisma.auditLog.create({
      data: {
        action: 'AUTOMATED_AGENT_SIGNATURE_CREATED',
        details: {
          signalId,
          agentId: signal.agentId,
          agentWallet: agentSignature.agentWallet,
          tokenSymbol: signal.tokenSymbol,
          side: signal.side,
          message: agentSignature.message,
          signature: agentSignature.signature,
          timestamp: agentSignature.timestamp,
          automated: true
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Automated agent signature created and verified successfully',
      signal: {
        id: updatedSignal.id,
        agentSignatureVerified: updatedSignal.agentSignatureVerified,
        agentWallet: updatedSignal.agentWallet,
        agentSignatureTimestamp: updatedSignal.agentSignatureTimestamp
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
