import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * List V3 Agents (separate from V2)
 * GET /api/v3/agents/list
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { creator_wallet, status } = req.query;

    let query = 'SELECT * FROM agents_v3 WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (creator_wallet) {
      query += ` AND creator_wallet = $${paramIndex}`;
      params.push(creator_wallet);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const agents = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    // Get deployment counts for each agent
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const deployments = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count 
          FROM agent_deployments_v3 
          WHERE agent_id = ${agent.id}::uuid;
        `;

        return {
          ...agent,
          deployment_count: Number(deployments[0]?.count || 0),
        };
      })
    );

    return res.status(200).json({
      success: true,
      agents: agentsWithCounts,
      count: agentsWithCounts.length,
      version: 'V3',
    });
  } catch (error: any) {
    console.error('❌ Failed to list V3 agents:', error);
    return res.status(500).json({
      error: 'Failed to list agents',
      message: error.message,
    });
  }
}

