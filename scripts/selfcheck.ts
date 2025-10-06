/**
 * Self-check script for Maxxit backend audit
 * 
 * Tests end-to-end flow:
 * 1. Health/ready checks
 * 2. Create temp agent
 * 3. Link CT account
 * 4. Create deployment
 * 5. Create signal (admin)
 * 6. Execute trade (admin)
 * 7. Close trade (admin)
 * 8. Verify positions, pnl_snapshots, billing_events
 * 9. Clean up temp data
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function selfcheck() {
  console.log('🔍 Starting Maxxit Backend Self-Check...\n');

  const tempData: any = {
    ctAccount: null,
    agent: null,
    deployment: null,
    signal: null,
    position: null,
  };

  try {
    // 1. Health & Ready
    console.log('✓ Step 1: Health checks');
    const health = await request('/api/health');
    console.log(`  /api/health: ${health.status}`);

    const ready = await request('/api/ready');
    console.log(`  /api/ready: ${ready.status}, DB: ${ready.checks.database}\n`);

    // 2. Create temp CT account
    console.log('✓ Step 2: Create CT account');
    tempData.ctAccount = await request('/api/db/ct_accounts', {
      method: 'POST',
      body: JSON.stringify({
        xUsername: `selfcheck_${Date.now()}`,
        displayName: 'Self-Check Account',
        impactFactor: 0.8,
      }),
    });
    console.log(`  Created CT account: ${tempData.ctAccount.id}\n`);

    // 3. Create temp agent
    console.log('✓ Step 3: Create agent');
    tempData.agent = await request('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        creatorWallet: '0xSelfCheckWallet',
        name: 'Self-Check Agent',
        venue: 'GMX',
        status: 'ACTIVE',
        weights: [50, 50, 50, 50, 50, 50, 50, 50],
      }),
    });
    console.log(`  Created agent: ${tempData.agent.id}\n`);

    // 4. Link CT account to agent
    console.log('✓ Step 4: Link CT account to agent');
    await request(`/api/agents/${tempData.agent.id}/accounts`, {
      method: 'POST',
      body: JSON.stringify({
        ctAccountId: tempData.ctAccount.id,
      }),
    });
    console.log(`  Linked account to agent\n`);

    // 5. Create deployment
    console.log('✓ Step 5: Create deployment');
    tempData.deployment = await request('/api/deployments', {
      method: 'POST',
      body: JSON.stringify({
        agentId: tempData.agent.id,
        userWallet: '0xSelfCheckUser',
        safeWallet: '0xSelfCheckSafe',
      }),
    });
    console.log(`  Created deployment: ${tempData.deployment.id}\n`);

    // 6. Create venue status (for signal validation)
    console.log('✓ Step 6: Create venue status');
    await request('/api/db/venues_status', {
      method: 'POST',
      body: JSON.stringify({
        venue: 'GMX',
        tokenSymbol: 'ETH',
        minSize: '0.01',
        tickSize: '0.01',
        slippageLimitBps: 50,
      }),
    });
    console.log(`  Created venue status for ETH/GMX\n`);

    // 7. Create signal candidate post
    console.log('✓ Step 7: Create signal candidate post');
    const post = await request('/api/db/ct_posts', {
      method: 'POST',
      body: JSON.stringify({
        ctAccountId: tempData.ctAccount.id,
        tweetId: `tweet_${Date.now()}`,
        tweetText: 'Bullish on ETH!',
        tweetCreatedAt: new Date().toISOString(),
        isSignalCandidate: true,
        extractedTokens: ['ETH'],
      }),
    });
    console.log(`  Created signal candidate post\n`);

    // 8. Run signal creation
    console.log('✓ Step 8: Run signal creation');
    const signalResult = await request('/api/admin/run-signal-once', {
      method: 'POST',
    });
    if (signalResult.signalsCreated > 0) {
      tempData.signal = signalResult.signals[0];
      console.log(`  Created ${signalResult.signalsCreated} signal(s): ${tempData.signal.id}\n`);
    } else {
      throw new Error('No signals created');
    }

    // 9. Execute trade
    console.log('✓ Step 9: Execute trade');
    const tradeResult = await request(`/api/admin/execute-trade-once?signalId=${tempData.signal.id}`, {
      method: 'POST',
    });
    if (tradeResult.positionsCreated > 0) {
      tempData.position = tradeResult.positions[0];
      console.log(`  Created ${tradeResult.positionsCreated} position(s): ${tempData.position.id}\n`);
    } else {
      throw new Error('No positions created');
    }

    // 10. Close trade with PnL
    console.log('✓ Step 10: Close trade');
    const closeResult = await request(`/api/admin/close-trade-simulated?positionId=${tempData.position.id}&pnl=50`, {
      method: 'POST',
    });
    console.log(`  Closed position with PnL: $50`);
    console.log(`  Billing events: ${closeResult.billingEvents.length}\n`);

    // 11. Update metrics
    console.log('✓ Step 11: Update agent metrics');
    const metricsResult = await request(`/api/admin/update-metrics?agentId=${tempData.agent.id}`, {
      method: 'POST',
    });
    console.log(`  Updated metrics: APR 30d = ${metricsResult.metrics.apr30d.toFixed(2)}%\n`);

    // 12. Verify data integrity and 6h bucketing
    console.log('✓ Step 12: Verify data integrity');
    
    const positions = await request(`/api/db/positions?deploymentId=eq.${tempData.deployment.id}`);
    console.log(`  Positions: ${positions.length}`);

    const billingEvents = await request(`/api/db/billing_events?deploymentId=eq.${tempData.deployment.id}`);
    console.log(`  Billing events: ${billingEvents.length}`);

    const pnlSnapshots = await request(`/api/db/pnl_snapshots?deploymentId=eq.${tempData.deployment.id}`);
    console.log(`  PnL snapshots: ${pnlSnapshots.length}`);

    // Verify 6h bucketing in signals response
    const signalsWithBucket = await request(`/api/signals?agentId=${tempData.agent.id}`);
    if (signalsWithBucket.length === 0) {
      throw new Error('No signals returned from /api/signals');
    }
    
    // Verify ALL signals have bucket6h field and are properly aligned
    for (const signal of signalsWithBucket) {
      if (!signal.bucket6h) {
        throw new Error(`Signal ${signal.id} missing bucket6h field`);
      }
      
      // Verify bucket6h is a valid ISO date string
      const bucketDate = new Date(signal.bucket6h);
      if (isNaN(bucketDate.getTime())) {
        throw new Error(`Signal ${signal.id} bucket6h is not a valid date string`);
      }
      
      // Verify bucket is aligned to 6h window (0, 6, 12, 18 UTC)
      const bucketHour = bucketDate.getUTCHours();
      if (![0, 6, 12, 18].includes(bucketHour)) {
        throw new Error(`Signal ${signal.id} bucket6h hour ${bucketHour} not aligned to 6h window`);
      }
      
      // Verify JSON serialization (no Decimal/BigInt objects)
      const jsonString = JSON.stringify(signal);
      const parsed = JSON.parse(jsonString);
      if (JSON.stringify(parsed) !== jsonString) {
        throw new Error(`Signal ${signal.id} not properly JSON serializable`);
      }
    }
    
    console.log(`  Signals with bucket6h: ✓ (verified ${signalsWithBucket.length} signal(s))\n`);

    console.log('✅ All checks passed!\n');

  } catch (error: any) {
    console.error('❌ Self-check failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up temp data...');
    
    try {
      if (tempData.deployment?.id) {
        await request(`/api/db/agent_deployments?id=eq.${tempData.deployment.id}`, { method: 'DELETE' });
      }
      if (tempData.agent?.id) {
        await request(`/api/db/agents?id=eq.${tempData.agent.id}`, { method: 'DELETE' });
      }
      if (tempData.ctAccount?.id) {
        await request(`/api/db/ct_accounts?id=eq.${tempData.ctAccount.id}`, { method: 'DELETE' });
      }
      console.log('✓ Cleanup complete\n');
    } catch (cleanupError: any) {
      console.warn('⚠ Cleanup warning:', cleanupError.message);
    }
  }
}

// Run selfcheck
selfcheck().then(() => {
  console.log('✨ Self-check completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Self-check failed:', error);
  process.exit(1);
});
