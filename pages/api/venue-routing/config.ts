/**
 * API: Venue Routing Configuration
 * GET: Get routing config for agent or global
 * POST: Set routing config for agent or global
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/venue-routing/config?agentId=xxx
 * Get routing configuration
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { agentId } = req.query;

    if (agentId && typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Invalid agentId' });
    }

    // Get agent-specific or global config
    const config = await prisma.venue_routing_config.findUnique({
      where: {
        agent_id: agentId || null,
      },
    });

    if (!config) {
      // Return default config
      return res.status(200).json({
        success: true,
        config: {
          venue_priority: ['HYPERLIQUID', 'OSTIUM'],
          routing_strategy: 'FIRST_AVAILABLE',
          failover_enabled: true,
          isDefault: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      config: {
        id: config.id,
        agent_id: config.agent_id,
        venue_priority: config.venue_priority,
        routing_strategy: config.routing_strategy,
        failover_enabled: config.failover_enabled,
        created_at: config.created_at,
        updated_at: config.updated_at,
        isDefault: false,
      },
    });
  } catch (error: any) {
    console.error('[VenueRoutingConfig] GET error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /api/venue-routing/config
 * Set routing configuration
 * 
 * Body: {
 *   agentId?: string;  // null = global
 *   venuePriority: string[];  // ["HYPERLIQUID", "OSTIUM"]
 *   routingStrategy?: string;
 *   failoverEnabled?: boolean;
 * }
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      agentId,
      venuePriority,
      routingStrategy = 'FIRST_AVAILABLE',
      failoverEnabled = true,
    } = req.body;

    // Validate venue priority
    if (!Array.isArray(venuePriority) || venuePriority.length === 0) {
      return res.status(400).json({
        error: 'venuePriority must be a non-empty array',
      });
    }

    const validVenues = ['HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT'];
    const invalidVenues = venuePriority.filter(v => !validVenues.includes(v));
    
    if (invalidVenues.length > 0) {
      return res.status(400).json({
        error: `Invalid venues: ${invalidVenues.join(', ')}. Valid: ${validVenues.join(', ')}`,
      });
    }

    // If agentId provided, verify agent exists
    if (agentId) {
      const agent = await prisma.agents.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Verify agent is a MULTI venue agent
      if (agent.venue !== 'MULTI') {
        return res.status(400).json({
          error: `Agent ${agent.name} is not a MULTI venue agent (current venue: ${agent.venue})`,
        });
      }
    }

    // Upsert config
    const config = await prisma.venue_routing_config.upsert({
      where: {
        agent_id: agentId || null,
      },
      create: {
        agent_id: agentId || null,
        venue_priority: venuePriority,
        routing_strategy: routingStrategy,
        failover_enabled: failoverEnabled,
      },
      update: {
        venue_priority: venuePriority,
        routing_strategy: routingStrategy,
        failover_enabled: failoverEnabled,
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      config: {
        id: config.id,
        agent_id: config.agent_id,
        venue_priority: config.venue_priority,
        routing_strategy: config.routing_strategy,
        failover_enabled: config.failover_enabled,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[VenueRoutingConfig] POST error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

