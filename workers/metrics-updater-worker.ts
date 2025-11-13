/**
 * Metrics Updater Worker
 * Updates agent performance metrics (APR, Sharpe) periodically
 * Schedule: Every 1 hour
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { updateAgentMetrics } from '../lib/metrics-updater';

const prisma = new PrismaClient();

async function updateAllAgentMetrics() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 METRICS UPDATER WORKER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log();

  try {
    // Get all active agents (V2)
    const agentsV2 = await prisma.agents.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, venue: true },
    });

    // Get all active V3 agents
    const agentsV3Raw = await prisma.$queryRaw<any[]>`
      SELECT id, name, venue 
      FROM agents_v3 
      WHERE status = 'ACTIVE'::agent_status_t;
    `;

    const agentsV3 = agentsV3Raw.map(a => ({
      id: a.id,
      name: a.name,
      venue: a.venue,
      isV3: true,
    }));

    const allAgents = [
      ...agentsV2.map(a => ({ ...a, isV3: false })),
      ...agentsV3,
    ];

    console.log(`📋 Found ${allAgents.length} active agents to update:`);
    console.log(`   • V2 agents: ${agentsV2.length}`);
    console.log(`   • V3 agents: ${agentsV3.length}`);
    console.log();

    let successCount = 0;
    let errorCount = 0;

    // Update metrics for each agent
    for (const agent of allAgents) {
      try {
        console.log(`[${agent.isV3 ? 'V3' : 'V2'}] Updating: ${agent.name} (${agent.venue})`);
        
        if (agent.isV3) {
          // V3 agents - update via raw query
          await updateV3AgentMetrics(agent.id);
        } else {
          // V2 agents - use existing updater
          await updateAgentMetrics(agent.id);
        }

        successCount++;
        console.log(`   ✅ Updated successfully`);
      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Error updating ${agent.name}:`, error.message);
      }
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 METRICS UPDATE SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors:  ${errorCount}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Fatal error in metrics updater:', error);
    throw error;
  }
}

/**
 * Update V3 agent metrics
 * Similar logic to the V2 updater but for V3 tables
 */
async function updateV3AgentMetrics(agentId: string) {
  // Get agent's venue
  const agent = await prisma.$queryRaw<any[]>`
    SELECT venue, name 
    FROM agents_v3 
    WHERE id = ${agentId}::uuid 
    LIMIT 1;
  `;

  if (!agent || agent.length === 0) {
    throw new Error('Agent not found');
  }

  const agentData = agent[0];

  // Get all closed positions for this agent
  const deployments = await prisma.$queryRaw<any[]>`
    SELECT id 
    FROM agent_deployments_v3 
    WHERE agent_id = ${agentId}::uuid;
  `;

  const deploymentIds = deployments.map(d => d.id);

  if (deploymentIds.length === 0) {
    console.log('   ℹ️  No deployments found - skipping');
    return;
  }

  // Get closed positions (filter by venue for MULTI agents)
  const venueFilter = agentData.venue === 'MULTI' 
    ? `venue IN ('HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT')`
    : `venue = '${agentData.venue}'::venue_v3_t`;

  const positions = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * 
    FROM positions_v3 
    WHERE deployment_id = ANY($1::uuid[])
      AND ${venueFilter}
      AND closed_at IS NOT NULL
    ORDER BY closed_at DESC;
  `, deploymentIds);

  if (positions.length === 0) {
    console.log('   ℹ️  No closed positions found - skipping');
    return;
  }

  // Calculate metrics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const positions30d = positions.filter(p => p.closed_at && new Date(p.closed_at) >= thirtyDaysAgo);
  const positions90d = positions.filter(p => p.closed_at && new Date(p.closed_at) >= ninetyDaysAgo);

  // Calculate PnL
  const totalPnl30d = positions30d.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0);
  const totalPnl90d = positions90d.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0);
  const totalPnlSi = positions.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0);

  // Calculate capital deployed
  const calculateCapitalDeployed = (positionList: any[]) => {
    return positionList.reduce((sum, p) => {
      const entryPrice = parseFloat(p.entry_price?.toString() || '0');
      const qty = parseFloat(p.qty?.toString() || '0');
      return sum + (entryPrice * qty);
    }, 0);
  };

  const capitalDeployed30d = calculateCapitalDeployed(positions30d);
  const capitalDeployed90d = calculateCapitalDeployed(positions90d);
  const capitalDeployedSi = calculateCapitalDeployed(positions);

  // APR calculation
  const apr30d = capitalDeployed30d > 0 
    ? (totalPnl30d / capitalDeployed30d) * (365 / 30) * 100
    : 0;
  const apr90d = capitalDeployed90d > 0
    ? (totalPnl90d / capitalDeployed90d) * (365 / 90) * 100
    : 0;
  const aprSi = capitalDeployedSi > 0
    ? (totalPnlSi / capitalDeployedSi) * (365 / ((now.getTime() - new Date(positions[positions.length - 1].created_at).getTime()) / (24 * 60 * 60 * 1000))) * 100
    : 0;

  // Sharpe ratio calculation (simplified)
  const calculateSharpeRatio = (positionList: any[]) => {
    if (positionList.length < 2) return 0;
    const returns = positionList.map(p => parseFloat(p.pnl?.toString() || '0'));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? avgReturn / stdDev : 0;
  };

  const sharpe30d = calculateSharpeRatio(positions30d);

  // Update agent
  await prisma.$queryRaw`
    UPDATE agents_v3
    SET 
      apr_30d = ${apr30d}::numeric,
      apr_90d = ${apr90d}::numeric,
      apr_si = ${aprSi}::numeric,
      sharpe_30d = ${sharpe30d}::numeric,
      updated_at = NOW()
    WHERE id = ${agentId}::uuid;
  `;

  console.log(`   📈 APR 30d: ${apr30d.toFixed(2)}%, 90d: ${apr90d.toFixed(2)}%, SI: ${aprSi.toFixed(2)}%`);
}

// Main execution
(async () => {
  try {
    await updateAllAgentMetrics();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

