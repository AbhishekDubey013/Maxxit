/**
 * Seed script for Maxxit DeFi platform
 * Populates the database with demo data for testing
 * 
 * Usage: tsx scripts/seed.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function apiRequest(path: string, method: string = 'GET', body?: any) {
  const url = `${API_BASE}/api/db/${path}`;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(`${method} ${path}: ${error.error || response.statusText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function seed() {
  console.log('🌱 Seeding Maxxit DeFi database...\n');

  try {
    // 1. Create CT Accounts
    console.log('📱 Creating CT Accounts...');
    const ctAccounts = await apiRequest('ct_accounts', 'POST', [
      { xUsername: 'CryptoWhale', displayName: 'Crypto Whale', followersCount: 500000, impactFactor: 85 },
      { xUsername: 'DeFiGuru', displayName: 'DeFi Guru', followersCount: 250000, impactFactor: 75 },
      { xUsername: 'ChainAnalyst', displayName: 'Chain Analyst', followersCount: 150000, impactFactor: 65 },
    ]);
    console.log(`✓ Created ${ctAccounts.length} CT accounts\n`);

    // 2. Create Agents
    console.log('🤖 Creating Agents...');
    const agents = await apiRequest('agents', 'POST', [
      {
        creatorWallet: '0xDemo...',
        name: 'Alpha Momentum Trader',
        venue: 'GMX',
        status: 'ACTIVE',
        weights: [80, 70, 65, 75, 60, 50, 70, 65],
        apr30d: 24.5,
        apr90d: 31.2,
        aprSi: 28.7,
        sharpe30d: 1.8,
      },
      {
        creatorWallet: '0xDemo...',
        name: 'Volatility Hunter',
        venue: 'HYPERLIQUID',
        status: 'ACTIVE',
        weights: [60, 85, 70, 90, 75, 40, 80, 70],
        apr30d: 18.3,
        apr90d: 22.1,
        aprSi: 19.8,
        sharpe30d: 1.5,
      },
      {
        creatorWallet: '0xDemo...',
        name: 'Steady Growth Bot',
        venue: 'SPOT',
        status: 'ACTIVE',
        weights: [50, 60, 55, 45, 40, 60, 50, 55],
        apr30d: 12.7,
        apr90d: 15.4,
        aprSi: 14.1,
        sharpe30d: 2.1,
      },
      {
        creatorWallet: '0xAnotherCreator',
        name: 'High Frequency Scalper',
        venue: 'GMX',
        status: 'ACTIVE',
        weights: [40, 75, 80, 85, 90, 30, 70, 60],
        apr30d: 32.8,
        apr90d: 28.3,
        aprSi: 30.1,
        sharpe30d: 1.2,
      },
      {
        creatorWallet: '0xDemo...',
        name: 'Conservative Hedger',
        venue: 'SPOT',
        status: 'PAUSED',
        weights: [30, 40, 35, 30, 25, 70, 40, 75],
        apr30d: 8.2,
        apr90d: 9.5,
        aprSi: 8.9,
        sharpe30d: 2.5,
      },
    ]);
    console.log(`✓ Created ${agents.length} agents\n`);

    // 3. Create Agent Deployments
    console.log('🚀 Creating Agent Deployments...');
    const deployments = await apiRequest('agent_deployments', 'POST', [
      {
        agentId: agents[0].id,
        userWallet: '0xUser1...',
        safeWallet: '0xSafe1...',
        status: 'ACTIVE',
        subActive: true,
        subStartedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        agentId: agents[1].id,
        userWallet: '0xUser2...',
        safeWallet: '0xSafe2...',
        status: 'ACTIVE',
        subActive: true,
        subStartedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        agentId: agents[2].id,
        userWallet: '0xUser3...',
        safeWallet: '0xSafe3...',
        status: 'ACTIVE',
        subActive: true,
        subStartedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    console.log(`✓ Created ${deployments.length} deployments\n`);

    // 4. Create Signals
    console.log('📊 Creating Signals...');
    const signals = await apiRequest('signals', 'POST', [
      {
        agentId: agents[0].id,
        tokenSymbol: 'ETH',
        venue: 'GMX',
        side: 'LONG',
        sizeModel: { size: 1000, confidence: 0.85 },
        riskModel: { stopLoss: 0.05, takeProfit: 0.15 },
        sourceTweets: ['tweet1', 'tweet2'],
      },
      {
        agentId: agents[0].id,
        tokenSymbol: 'BTC',
        venue: 'GMX',
        side: 'LONG',
        sizeModel: { size: 1500, confidence: 0.80 },
        riskModel: { stopLoss: 0.04, takeProfit: 0.12 },
        sourceTweets: ['tweet2', 'tweet3'],
      },
      {
        agentId: agents[1].id,
        tokenSymbol: 'SOL',
        venue: 'HYPERLIQUID',
        side: 'SHORT',
        sizeModel: { size: 2000, confidence: 0.78 },
        riskModel: { stopLoss: 0.04, takeProfit: 0.10 },
        sourceTweets: ['tweet4'],
      },
    ]);
    console.log(`✓ Created ${signals.length} signals\n`);

    // 5. Create Positions
    console.log('💰 Creating Positions...');
    const positions = await apiRequest('positions', 'POST', [
      {
        deploymentId: deployments[0].id,
        signalId: signals[0].id,
        venue: 'GMX',
        tokenSymbol: 'ETH',
        side: 'LONG',
        qty: '0.5',
        entryPrice: '2850.00',
        stopLoss: '2700.00',
        takeProfit: '3100.00',
        status: 'OPEN',
        openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        deploymentId: deployments[0].id,
        signalId: signals[1].id,
        venue: 'GMX',
        tokenSymbol: 'BTC',
        side: 'LONG',
        qty: '0.1',
        entryPrice: '42000.00',
        stopLoss: '40000.00',
        takeProfit: '46000.00',
        status: 'CLOSED',
        openedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        exitPrice: '44500.00',
        pnl: '250.00',
      },
      {
        deploymentId: deployments[1].id,
        signalId: signals[2].id,
        venue: 'HYPERLIQUID',
        tokenSymbol: 'SOL',
        side: 'SHORT',
        qty: '10',
        entryPrice: '105.00',
        stopLoss: '110.00',
        takeProfit: '95.00',
        status: 'CLOSED',
        openedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        exitPrice: '98.00',
        pnl: '70.00',
      },
    ]);
    console.log(`✓ Created ${positions.length} positions\n`);

    // 6. Create Billing Events
    console.log('💳 Creating Billing Events...');
    const billingEvents = await apiRequest('billing_events', 'POST', [
      {
        deploymentId: deployments[0].id,
        positionId: positions[1].id,
        kind: 'INFRA_FEE',
        amount: '0.20',
        asset: 'USDC',
        status: 'CHARGED',
        occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        deploymentId: deployments[0].id,
        positionId: positions[1].id,
        kind: 'PROFIT_SHARE',
        amount: '25.00',
        asset: 'USDC',
        status: 'CHARGED',
        metadata: { profitPct: 10 },
        occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        deploymentId: deployments[0].id,
        kind: 'SUBSCRIPTION',
        amount: '20.00',
        asset: 'USDC',
        status: 'CHARGED',
        occurredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    console.log(`✓ Created ${billingEvents.length} billing events\n`);

    // 7. Create PnL Snapshots (for sparkline charts)
    console.log('📈 Creating PnL Snapshots...');
    const snapshots = [];
    for (let i = 30; i >= 0; i--) {
      const dayDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayDate.setHours(0, 0, 0, 0); // Set to midnight
      const day = dayDate.toISOString();
      const baseReturn = 2.5;
      const variance = (Math.random() - 0.5) * 3;
      
      snapshots.push({
        agentId: agents[0].id,
        deploymentId: deployments[0].id,
        day,
        returnPct: baseReturn + variance,
        pnl: ((baseReturn + variance) * 100).toString(),
      });
    }
    const pnlSnapshots = await apiRequest('pnl_snapshots', 'POST', snapshots);
    console.log(`✓ Created ${pnlSnapshots.length} PnL snapshots\n`);

    console.log('✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${ctAccounts.length} CT accounts`);
    console.log(`  - ${agents.length} agents`);
    console.log(`  - ${deployments.length} deployments`);
    console.log(`  - ${signals.length} signals`);
    console.log(`  - ${positions.length} positions`);
    console.log(`  - ${billingEvents.length} billing events`);
    console.log(`  - ${pnlSnapshots.length} PnL snapshots`);
  } catch (error: any) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
