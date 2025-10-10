import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createTelegramBot } from '../../../lib/telegram-bot';

const prisma = new PrismaClient();
const bot = createTelegramBot();

/**
 * Generate a one-time Telegram link code for a deployment
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deploymentId } = req.body;

    if (!deploymentId) {
      return res.status(400).json({ error: 'deploymentId required' });
    }

    // Verify deployment exists
    const deployment = await prisma.agentDeployment.findUnique({
      where: { id: deploymentId },
      include: {
        agent: true,
        telegramUsers: {
          where: { isActive: true }
        }
      }
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Check if already linked
    if (deployment.telegramUsers.length > 0) {
      return res.status(400).json({
        error: 'Telegram already linked to this deployment',
        linkedUser: deployment.telegramUsers[0]
      });
    }

    // Generate link code
    const linkCode = bot.generateLinkCode();

    // Create placeholder telegram user with link code
    await prisma.telegramUser.create({
      data: {
        telegramUserId: `pending_${Date.now()}`, // Temporary, will be updated when user links
        deploymentId,
        linkCode,
        isActive: false, // Not active until linked
      }
    });

    // Get bot info for instructions
    const botInfo = await bot.getMe();
    const botUsername = botInfo?.username || 'MaxxitBot';

    return res.status(200).json({
      success: true,
      linkCode,
      botUsername,
      instructions: `1. Open Telegram\n2. Search for @${botUsername}\n3. Send: /link ${linkCode}\n\nCode expires in 10 minutes.`
    });

  } catch (error: any) {
    console.error('[API] Generate link error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

