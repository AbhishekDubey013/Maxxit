import type { NextApiRequest, NextApiResponse} from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Admin endpoint to execute a trade for a given signal
 * 
 * Flow:
 * 1. Find ACTIVE deployments for the signal's agent
 * 2. Compute position size from sizeModel
 * 3. Enforce venue constraints (min_size, slippage)
 * 4. Call venue adapter stub
 * 5. Insert position (OPEN status)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId } = req.query;

    if (!signalId || typeof signalId !== 'string') {
      return res.status(400).json({ error: 'signalId query param required' });
    }

    console.log(`[ADMIN] Executing trade for signal ${signalId}`);

    // Get signal
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Find ACTIVE deployments for this agent
    const deployments = await prisma.agentDeployment.findMany({
      where: {
        agentId: signal.agentId,
        status: 'ACTIVE',
        subActive: true,
      },
    });

    if (deployments.length === 0) {
      return res.status(200).json({
        message: 'No active deployments found',
        positionsCreated: 0,
      });
    }

    // Check venue status for min size/slippage
    const venueStatus = await prisma.venueStatus.findUnique({
      where: {
        venue_tokenSymbol: {
          venue: signal.venue,
          tokenSymbol: signal.tokenSymbol,
        },
      },
    });

    const sizeModel: any = signal.sizeModel;
    const qty = sizeModel.baseSize || 100;

    // Check min size constraint
    if (venueStatus?.minSize && parseFloat(qty.toString()) < parseFloat(venueStatus.minSize.toString())) {
      return res.status(400).json({
        error: 'Position size below venue minimum',
      });
    }

    const positionsCreated = [];

    for (const deployment of deployments) {
      // Check for duplicate position (same deployment + signal)
      const existing = await prisma.position.findUnique({
        where: {
          deploymentId_signalId: {
            deploymentId: deployment.id,
            signalId: signal.id,
          },
        },
      });

      if (existing) {
        console.log(`[TRADE] Position already exists for deployment ${deployment.id}`);
        continue;
      }

      // Stub: Call venue adapter (GMX/Hyperliquid/Spot)
      const entryPrice = 100.0; // Mock entry price
      const riskModel: any = signal.riskModel;

      // Create position
      const position = await prisma.position.create({
        data: {
          deploymentId: deployment.id,
          signalId: signal.id,
          venue: signal.venue,
          tokenSymbol: signal.tokenSymbol,
          side: signal.side,
          qty: qty.toString(),
          entryPrice: entryPrice.toString(),
          stopLoss: riskModel.stopLoss ? (entryPrice * (1 - riskModel.stopLoss)).toString() : undefined,
          takeProfit: riskModel.takeProfit ? (entryPrice * (1 + riskModel.takeProfit)).toString() : undefined,
        },
      });

      positionsCreated.push(position);
      console.log(`[TRADE] Created position for deployment ${deployment.id}`);
    }

    return res.status(200).json({
      message: 'Trade execution completed',
      positionsCreated: positionsCreated.length,
      positions: positionsCreated,
    });
  } catch (error: any) {
    console.error('[ADMIN] Trade execution error:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
