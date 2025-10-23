import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyProofOfIntent, validateProofOfIntentData } from '@lib/proof-of-intent';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, message, signature, creatorWallet } = req.body;

    // Validate required fields
    if (!agentId || !message || !signature || !creatorWallet) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, message, signature, creatorWallet'
      });
    }

    console.log(`[VerifyProofOfIntent] Verifying proof for agent: ${agentId}`);

    // Find the agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }

    // Verify the signature
    const verificationResult = await verifyProofOfIntent(
      message,
      signature,
      creatorWallet
    );

    if (!verificationResult.isValid) {
      console.log(`[VerifyProofOfIntent] Verification failed: ${verificationResult.error}`);
      return res.status(400).json({
        success: false,
        error: verificationResult.error,
        agentId
      });
    }

    // Update the agent with proof of intent data
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        proofOfIntentMessage: message,
        proofOfIntentSignature: signature,
        proofOfIntentTimestamp: new Date(),
      }
    });

    console.log(`[VerifyProofOfIntent] Proof verified and stored for agent: ${agentId}`);

    return res.status(200).json({
      success: true,
      message: 'Proof of intent verified and stored successfully',
      agentId,
      verifiedAddress: verificationResult.recoveredAddress
    });

  } catch (error: any) {
    console.error('[VerifyProofOfIntent] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify proof of intent'
    });
  } finally {
    await prisma.$disconnect();
  }
}
