import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Deploy V3 Agent to user wallet
 * POST /api/v3/agents/deploy
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      agent_id,
      user_wallet,
      hyperliquid_agent_address,
      hyperliquid_agent_key_encrypted,
      hyperliquid_agent_key_iv,
      hyperliquid_agent_key_tag,
      ostium_agent_address,
      ostium_agent_key_encrypted,
      ostium_agent_key_iv,
      ostium_agent_key_tag,
    } = req.body;

    // Validation
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    if (!user_wallet) {
      return res.status(400).json({ error: 'user_wallet is required' });
    }

    // Verify agent exists
    const agent = await prisma.$queryRaw<any[]>`
      SELECT id FROM agents_v3 WHERE id = ${agent_id}::uuid LIMIT 1;
    `;

    if (agent.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if already deployed
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM agent_deployments_v3 
      WHERE agent_id = ${agent_id}::uuid 
      AND user_wallet = ${user_wallet}
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Agent already deployed to this wallet',
        deployment_id: existing[0].id,
      });
    }

    // Create deployment
    const deployment = await prisma.$queryRaw<any[]>`
      INSERT INTO agent_deployments_v3 (
        agent_id,
        user_wallet,
        status,
        hyperliquid_agent_address,
        hyperliquid_agent_key_encrypted,
        hyperliquid_agent_key_iv,
        hyperliquid_agent_key_tag,
        ostium_agent_address,
        ostium_agent_key_encrypted,
        ostium_agent_key_iv,
        ostium_agent_key_tag
      ) VALUES (
        ${agent_id}::uuid,
        ${user_wallet},
        'ACTIVE',
        ${hyperliquid_agent_address || null},
        ${hyperliquid_agent_key_encrypted || null},
        ${hyperliquid_agent_key_iv || null},
        ${hyperliquid_agent_key_tag || null},
        ${ostium_agent_address || null},
        ${ostium_agent_key_encrypted || null},
        ${ostium_agent_key_iv || null},
        ${ostium_agent_key_tag || null}
      )
      RETURNING *;
    `;

    console.log('✅ V3 Agent deployed:', deployment[0].id);

    return res.status(201).json({
      success: true,
      deployment: deployment[0],
    });
  } catch (error: any) {
    console.error('❌ Failed to deploy V3 agent:', error);
    return res.status(500).json({
      error: 'Failed to deploy agent',
      message: error.message,
    });
  }
}

