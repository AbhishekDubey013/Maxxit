/**
 * API: Routing Analytics
 * Detailed analytics for Agent Where routing decisions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { venueRouterMonitoring } from '../../../lib/venue-router-monitoring';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeWindow = 'day' } = req.query;

    if (typeof timeWindow !== 'string' || !['hour', 'day', 'week'].includes(timeWindow)) {
      return res.status(400).json({
        error: 'Invalid timeWindow. Must be: hour, day, or week',
      });
    }

    const analytics = await venueRouterMonitoring.getRoutingAnalytics(
      timeWindow as 'hour' | 'day' | 'week'
    );

    return res.status(200).json({
      success: true,
      ...analytics,
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

