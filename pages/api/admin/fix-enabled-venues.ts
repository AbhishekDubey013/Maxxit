/**
 * Admin endpoint to fix enabled_venues for existing deployments
 * For MULTI venue agents, sets enabled_venues to ['HYPERLIQUID', 'OSTIUM']
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deploymentId } = req.body;

    if (deploymentId) {
      // Fix specific deployment
      const deployment = await prisma.agent_deployments.findUnique({
        where: { id: deploymentId },
        include: { agents: true }
      });

      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      // Update enabled_venues based on agent venue
      const enabledVenues = deployment.agents.venue === 'MULTI' 
        ? ['HYPERLIQUID', 'OSTIUM']
        : [deployment.agents.venue];

      await prisma.agent_deployments.update({
        where: { id: deploymentId },
        data: { enabled_venues: enabledVenues }
      });

      return res.status(200).json({
        success: true,
        deployment: {
          id: deployment.id,
          agent: deployment.agents.name,
          venue: deployment.agents.venue,
          enabled_venues: enabledVenues
        }
      });
    }

    // Fix all deployments with empty enabled_venues
    const deploymentsToFix = await prisma.agent_deployments.findMany({
      where: {
        OR: [
          { enabled_venues: { equals: [] } },
          { enabled_venues: { equals: null } }
        ]
      },
      include: { agents: true }
    });

    console.log(`[FixEnabledVenues] Found ${deploymentsToFix.length} deployments to fix`);

    const results = [];
    for (const deployment of deploymentsToFix) {
      const enabledVenues = deployment.agents.venue === 'MULTI' 
        ? ['HYPERLIQUID', 'OSTIUM']
        : [deployment.agents.venue];

      await prisma.agent_deployments.update({
        where: { id: deployment.id },
        data: { enabled_venues: enabledVenues }
      });

      results.push({
        id: deployment.id,
        agent: deployment.agents.name,
        venue: deployment.agents.venue,
        enabled_venues: enabledVenues
      });

      console.log(`[FixEnabledVenues] ✅ Fixed ${deployment.agents.name}: ${enabledVenues.join(', ')}`);
    }

    return res.status(200).json({
      success: true,
      fixed: results.length,
      deployments: results
    });

  } catch (error: any) {
    console.error('[FixEnabledVenues] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fix enabled_venues'
    });
  } finally {
    await prisma.$disconnect();
  }
}

