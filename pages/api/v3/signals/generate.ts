import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate V3 Signal (venue-agnostic)
 * POST /api/v3/signals/generate
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      agent_id,
      token_symbol,
      side, // LONG | SHORT
      size_model, // { type: "percentage", value: 25 }
      risk_model, // { type: "trailing-stop", stop: 0.03 }
      confidence = 0.8,
      source_tweets = [],
      source_research = [],
    } = req.body;

    // Validation
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    if (!token_symbol) {
      return res.status(400).json({ error: 'token_symbol is required' });
    }

    if (!side || !['LONG', 'SHORT'].includes(side)) {
      return res.status(400).json({ error: 'side must be LONG or SHORT' });
    }

    if (!size_model) {
      return res.status(400).json({ error: 'size_model is required' });
    }

    if (!risk_model) {
      return res.status(400).json({ error: 'risk_model is required' });
    }

    // Verify agent exists
    const agent = await prisma.$queryRaw<any[]>`
      SELECT id FROM agents_v3 WHERE id = ${agent_id}::uuid LIMIT 1;
    `;

    if (agent.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Create signal (venue-agnostic, starts as MULTI)
    const signal = await prisma.$queryRaw<any[]>`
      INSERT INTO signals_v3 (
        agent_id,
        token_symbol,
        side,
        size_model,
        risk_model,
        confidence,
        requested_venue,
        source_tweets,
        source_research,
        status
      ) VALUES (
        ${agent_id}::uuid,
        ${token_symbol},
        ${side},
        ${JSON.stringify(size_model)}::JSONB,
        ${JSON.stringify(risk_model)}::JSONB,
        ${confidence},
        'MULTI',
        ${source_tweets}::TEXT[],
        ${source_research}::TEXT[],
        'PENDING'
      )
      RETURNING *;
    `;

    console.log('✅ V3 Signal created:', signal[0].id, '(MULTI venue - will be routed)');

    return res.status(201).json({
      success: true,
      signal: signal[0],
      message: 'Signal created with MULTI venue - will be automatically routed to best venue',
    });
  } catch (error: any) {
    console.error('❌ Failed to create V3 signal:', error);
    return res.status(500).json({
      error: 'Failed to create signal',
      message: error.message,
    });
  }
}

