import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create V3 Agent (venue-agnostic, always MULTI)
 * POST /api/v3/agents/create
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      creator_wallet,
      name,
      x_account_ids = [],
      research_institute_ids = [],
      weights = { x: 0.5, research: 0.5 },
      profit_receiver_address,
      proof_of_intent,
    } = req.body;

    // Validation
    if (!creator_wallet) {
      return res.status(400).json({ error: 'creator_wallet is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!profit_receiver_address) {
      return res.status(400).json({ error: 'profit_receiver_address is required' });
    }

    if (x_account_ids.length === 0 && research_institute_ids.length === 0) {
      return res.status(400).json({ 
        error: 'At least one X account or research institute is required' 
      });
    }

    // Create V3 agent (always MULTI venue)
    const agent = await prisma.$queryRaw<any[]>`
      INSERT INTO agents_v3 (
        creator_wallet,
        name,
        venue,
        status,
        x_account_ids,
        research_institute_ids,
        weights,
        profit_receiver_address,
        proof_of_intent_message,
        proof_of_intent_signature,
        proof_of_intent_timestamp
      ) VALUES (
        ${creator_wallet},
        ${name},
        'MULTI',
        'DRAFT',
        ${x_account_ids}::TEXT[],
        ${research_institute_ids}::TEXT[],
        ${JSON.stringify(weights)}::JSONB,
        ${profit_receiver_address},
        ${proof_of_intent?.message || null},
        ${proof_of_intent?.signature || null},
        ${proof_of_intent?.timestamp ? new Date(proof_of_intent.timestamp) : null}
      )
      RETURNING *;
    `;

    console.log('✅ V3 Agent created:', agent[0].id);

    return res.status(201).json({
      success: true,
      agent: agent[0],
    });
  } catch (error: any) {
    console.error('❌ Failed to create V3 agent:', error);
    return res.status(500).json({
      error: 'Failed to create agent',
      message: error.message,
    });
  }
}

