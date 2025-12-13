import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

// RPC endpoint for Arbitrum
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

interface AgentWithStats {
  id: string;
  name: string;
  venue: string;
  creatorWallet: string;
  profitReceiverAddress: string;
  status: string | null;
  apr30d: number | null;
  apr90d: number | null;
  sharpe30d: number | null;
  subscriberCount: number;
  activeSubscribers: number;
  totalPositions: number;
  openPositions: number;
  totalSignals: number;
  totalPnl: number;
  walletBalance: string | null;
}

interface DashboardStats {
  overview: {
    totalAgents: number;
    publicAgents: number;
    privateAgents: number;
    draftAgents: number;
    totalDeployments: number;
    activeDeployments: number;
    pausedDeployments: number;
    totalPositions: number;
    openPositions: number;
    closedPositions: number;
    totalSignals: number;
    totalPnl: number;
    totalBillingEvents: number;
    totalTelegramUsers: number;
    totalCtAccounts: number;
    totalResearchInstitutes: number;
  };
  agents: AgentWithStats[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
    metadata?: any;
  }[];
  venueBreakdown: {
    venue: string;
    agentCount: number;
    deploymentCount: number;
    positionCount: number;
  }[];
  dailyStats: {
    date: string;
    signals: number;
    positions: number;
    pnl: number;
  }[];
}

async function getWalletBalance(address: string): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`Failed to fetch balance for ${address}:`, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all overview counts in parallel
    const [
      totalAgents,
      publicAgents,
      privateAgents,
      draftAgents,
      totalDeployments,
      activeDeployments,
      pausedDeployments,
      totalPositions,
      openPositions,
      closedPositions,
      totalSignals,
      totalBillingEvents,
      totalTelegramUsers,
      totalCtAccounts,
      totalResearchInstitutes,
    ] = await Promise.all([
      prisma.agents.count(),
      prisma.agents.count({ where: { status: 'PUBLIC' } }),
      prisma.agents.count({ where: { status: 'PRIVATE' } }),
      prisma.agents.count({ where: { status: 'DRAFT' } }),
      prisma.agent_deployments.count(),
      prisma.agent_deployments.count({ where: { status: 'ACTIVE' } }),
      prisma.agent_deployments.count({ where: { status: 'PAUSED' } }),
      prisma.positions.count(),
      prisma.positions.count({ where: { status: 'OPEN' } }),
      prisma.positions.count({ where: { closed_at: { not: null } } }),
      prisma.signals.count(),
      prisma.billing_events.count(),
      prisma.telegram_users.count(),
      prisma.ct_accounts.count(),
      prisma.research_institutes.count(),
    ]);

    // Calculate total PnL
    const pnlSum = await prisma.positions.aggregate({
      _sum: {
        pnl: true,
      },
      where: {
        pnl: { not: null },
      },
    });
    const totalPnl = pnlSum._sum.pnl ? Number(pnlSum._sum.pnl) : 0;

    // Fetch agents with their stats
    const agents = await prisma.agents.findMany({
      include: {
        agent_deployments: {
          include: {
            positions: true,
          },
        },
        signals: true,
      },
      orderBy: {
        apr_30d: 'desc',
      },
    });

    // Process agents with stats
    const agentsWithStats: AgentWithStats[] = await Promise.all(
      agents.map(async (agent) => {
        const subscriberCount = agent.agent_deployments.length;
        const activeSubscribers = agent.agent_deployments.filter(
          (d) => d.status === 'ACTIVE'
        ).length;

        const allPositions = agent.agent_deployments.flatMap((d) => d.positions);
        const totalAgentPositions = allPositions.length;
        const openAgentPositions = allPositions.filter((p) => p.status === 'OPEN').length;
        const totalAgentPnl = allPositions.reduce(
          (sum, p) => sum + (p.pnl ? Number(p.pnl) : 0),
          0
        );

        // Fetch wallet balance for profit receiver address
        const walletBalance = await getWalletBalance(agent.profit_receiver_address);

        return {
          id: agent.id,
          name: agent.name,
          venue: agent.venue,
          creatorWallet: agent.creator_wallet,
          profitReceiverAddress: agent.profit_receiver_address,
          status: agent.status,
          apr30d: agent.apr_30d,
          apr90d: agent.apr_90d,
          sharpe30d: agent.sharpe_30d,
          subscriberCount,
          activeSubscribers,
          totalPositions: totalAgentPositions,
          openPositions: openAgentPositions,
          totalSignals: agent.signals.length,
          totalPnl: totalAgentPnl,
          walletBalance,
        };
      })
    );

    // Fetch recent activity (audit logs)
    const recentAuditLogs = await prisma.audit_logs.findMany({
      orderBy: { occurred_at: 'desc' },
      take: 20,
    });

    const recentActivity = recentAuditLogs.map((log) => ({
      type: log.event_name,
      description: `${log.event_name} on ${log.subject_type || 'system'}`,
      timestamp: log.occurred_at.toISOString(),
      metadata: log.payload,
    }));

    // Venue breakdown
    const venueBreakdown = await Promise.all(
      ['HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT', 'MULTI'].map(async (venue) => {
        const [agentCount, deploymentCount, positionCount] = await Promise.all([
          prisma.agents.count({ where: { venue: venue as any } }),
          prisma.agent_deployments.count({
            where: { agents: { venue: venue as any } },
          }),
          prisma.positions.count({ where: { venue: venue as any } }),
        ]);
        return { venue, agentCount, deploymentCount, positionCount };
      })
    );

    // Daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignals = await prisma.signals.groupBy({
      by: ['created_at'],
      where: {
        created_at: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    const dailyPositions = await prisma.positions.groupBy({
      by: ['opened_at'],
      where: {
        opened_at: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Aggregate daily stats
    const dailyStatsMap = new Map<string, { signals: number; positions: number; pnl: number }>();

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStatsMap.set(dateStr, { signals: 0, positions: 0, pnl: 0 });
    }

    dailySignals.forEach((s) => {
      const dateStr = s.created_at.toISOString().split('T')[0];
      const existing = dailyStatsMap.get(dateStr);
      if (existing) {
        existing.signals += s._count;
      }
    });

    dailyPositions.forEach((p) => {
      const dateStr = p.opened_at.toISOString().split('T')[0];
      const existing = dailyStatsMap.get(dateStr);
      if (existing) {
        existing.positions += p._count;
      }
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats: DashboardStats = {
      overview: {
        totalAgents,
        publicAgents,
        privateAgents,
        draftAgents,
        totalDeployments,
        activeDeployments,
        pausedDeployments,
        totalPositions,
        openPositions,
        closedPositions,
        totalSignals,
        totalPnl,
        totalBillingEvents,
        totalTelegramUsers,
        totalCtAccounts,
        totalResearchInstitutes,
      },
      agents: agentsWithStats,
      recentActivity,
      venueBreakdown,
      dailyStats,
    };

    res.status(200).json(stats);
  } catch (error: any) {
    console.error('[Admin Dashboard Stats] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' });
  } finally {
    await prisma.$disconnect();
  }
}

