/**
 * API: System Health Check
 * Comprehensive health monitoring for Agent Where system
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
    const healthReport = await venueRouterMonitoring.getHealthReport();

    // Set appropriate HTTP status based on health
    const statusCode = {
      healthy: 200,
      degraded: 200, // Still operational
      critical: 503, // Service unavailable
    }[healthReport.overallStatus];

    return res.status(statusCode).json({
      success: healthReport.overallStatus !== 'critical',
      status: healthReport.overallStatus,
      ...healthReport,
    });
  } catch (error: any) {
    console.error('[Health] Error:', error);
    return res.status(500).json({
      success: false,
      status: 'critical',
      error: error.message,
      timestamp: new Date(),
    });
  }
}

