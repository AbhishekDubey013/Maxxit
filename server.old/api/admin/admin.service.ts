import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { GmxAdapter } from '../../adapters/gmx.adapter';
import { HyperliquidAdapter } from '../../adapters/hyperliquid.adapter';
import { SpotAdapter } from '../../adapters/spot.adapter';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private gmxAdapter: GmxAdapter,
    private hyperliquidAdapter: HyperliquidAdapter,
    private spotAdapter: SpotAdapter,
  ) {}

  async refreshVenues() {
    const commonTokens = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB'];
    let upsertedCount = 0;

    for (const token of commonTokens) {
      const gmxExists = await this.gmxAdapter.pairExists(token);
      if (gmxExists) {
        const minSize = await this.gmxAdapter.minSize(token);
        const tickSize = await this.gmxAdapter.tickSize(token);
        const slippageLimitBps = await this.gmxAdapter.slippageGuard(100);

        await this.prisma.venueStatus.upsert({
          where: {
            venue_tokenSymbol: {
              venue: 'GMX',
              tokenSymbol: token,
            },
          },
          create: {
            venue: 'GMX',
            tokenSymbol: token,
            minSize,
            tickSize,
            slippageLimitBps,
          },
          update: {
            minSize,
            tickSize,
            slippageLimitBps,
          },
        });
        upsertedCount++;
      }

      const hlExists = await this.hyperliquidAdapter.pairExists(token);
      if (hlExists) {
        const minSize = await this.hyperliquidAdapter.minSize(token);
        const tickSize = await this.hyperliquidAdapter.tickSize(token);
        const slippageLimitBps = await this.hyperliquidAdapter.slippageGuard(100);

        await this.prisma.venueStatus.upsert({
          where: {
            venue_tokenSymbol: {
              venue: 'HYPERLIQUID',
              tokenSymbol: token,
            },
          },
          create: {
            venue: 'HYPERLIQUID',
            tokenSymbol: token,
            minSize,
            tickSize,
            slippageLimitBps,
          },
          update: {
            minSize,
            tickSize,
            slippageLimitBps,
          },
        });
        upsertedCount++;
      }

      const spotExists = await this.spotAdapter.pairExists(token);
      if (spotExists) {
        const minSize = await this.spotAdapter.minSize(token);
        const tickSize = await this.spotAdapter.tickSize(token);
        const slippageLimitBps = await this.spotAdapter.slippageGuard(100);

        await this.prisma.venueStatus.upsert({
          where: {
            venue_tokenSymbol: {
              venue: 'SPOT',
              tokenSymbol: token,
            },
          },
          create: {
            venue: 'SPOT',
            tokenSymbol: token,
            minSize,
            tickSize,
            slippageLimitBps,
          },
          update: {
            minSize,
            tickSize,
            slippageLimitBps,
          },
        });
        upsertedCount++;
      }
    }

    await this.prisma.tokenRegistry.upsert({
      where: {
        chain_tokenSymbol: {
          chain: 'ethereum',
          tokenSymbol: 'USDC',
        },
      },
      create: {
        chain: 'ethereum',
        tokenSymbol: 'USDC',
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        preferredRouter: 'uniswap-v3',
      },
      update: {
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        preferredRouter: 'uniswap-v3',
      },
    });

    return {
      message: 'Venues refreshed successfully',
      venueStatusUpserted: upsertedCount,
      tokenRegistryUpserted: 1,
    };
  }

  async rebuildMetrics(agentId?: string) {
    const where = agentId ? { id: agentId } : {};
    const agents = await this.prisma.agent.findMany({ where });

    let rebuiltCount = 0;

    for (const agent of agents) {
      const pnlSnapshots = await this.prisma.pnlSnapshot.findMany({
        where: { agentId: agent.id },
        orderBy: { day: 'desc' },
        take: 90,
      });

      if (pnlSnapshots.length === 0) {
        continue;
      }

      const returns = pnlSnapshots
        .map(s => s.returnPct)
        .filter((r): r is number => r !== null);

      if (returns.length === 0) {
        continue;
      }

      const last30 = returns.slice(0, Math.min(30, returns.length));
      const last90 = returns.slice(0, Math.min(90, returns.length));
      const sinceInception = returns;

      const apr30d = this.calculateAPR(last30);
      const apr90d = this.calculateAPR(last90);
      const aprSi = this.calculateAPR(sinceInception);
      const sharpe30d = this.calculateSharpe(last30);

      await this.prisma.agent.update({
        where: { id: agent.id },
        data: {
          apr30d,
          apr90d,
          aprSi,
          sharpe30d,
        },
      });

      rebuiltCount++;
    }

    return {
      message: 'Metrics rebuilt successfully',
      agentsUpdated: rebuiltCount,
    };
  }

  private calculateAPR(returns: number[]): number {
    if (returns.length === 0) return 0;
    const avgDailyReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return avgDailyReturn * 365;
  }

  private calculateSharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    return (mean / stdDev) * Math.sqrt(365);
  }
}
