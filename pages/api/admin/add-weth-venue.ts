/**
 * API: Add WETH to venueStatus
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API] Adding WETH to venueStatus...');

    // Check if already exists
    const existing = await prisma.venueStatus.findUnique({
      where: {
        venue_tokenSymbol: {
          venue: 'SPOT',
          tokenSymbol: 'WETH',
        },
      },
    });

    if (existing) {
      console.log('[API] WETH already exists, ensuring it is available');
      
      if (!existing.isAvailable) {
        await prisma.venueStatus.update({
          where: {
            venue_tokenSymbol: {
              venue: 'SPOT',
              tokenSymbol: 'WETH',
            },
          },
          data: {
            isAvailable: true,
          },
        });
        
        return res.status(200).json({
          success: true,
          message: 'WETH updated to available',
          action: 'updated',
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'WETH already available',
        action: 'already_exists',
      });
    }

    // Create new entry
    await prisma.venueStatus.create({
      data: {
        venue: 'SPOT',
        tokenSymbol: 'WETH',
        isAvailable: true,
      },
    });

    console.log('[API] ✅ WETH added to venueStatus');

    return res.status(200).json({
      success: true,
      message: 'WETH added to venueStatus',
      action: 'created',
    });

  } catch (error: any) {
    console.error('[API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}

