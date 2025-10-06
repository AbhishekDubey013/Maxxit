import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  console.log("Creating CT Accounts...");
  const ctAccount1 = await prisma.ctAccount.upsert({
    where: { xUsername: "crypto_trader_1" },
    update: {},
    create: {
      xUsername: "crypto_trader_1",
      displayName: "Alpha Trader",
      followersCount: 50000,
      impactFactor: 0.85,
    },
  });

  const ctAccount2 = await prisma.ctAccount.upsert({
    where: { xUsername: "defi_whale" },
    update: {},
    create: {
      xUsername: "defi_whale",
      displayName: "DeFi Whale",
      followersCount: 120000,
      impactFactor: 0.92,
    },
  });

  const ctAccount3 = await prisma.ctAccount.upsert({
    where: { xUsername: "signal_master" },
    update: {},
    create: {
      xUsername: "signal_master",
      displayName: "Signal Master",
      followersCount: 75000,
      impactFactor: 0.78,
    },
  });

  console.log("Creating Agents...");
  const agent1 = await prisma.agent.upsert({
    where: { id: "agent-1-momentum-gmx" },
    update: {},
    create: {
      id: "agent-1-momentum-gmx",
      creatorWallet: "0x1234567890123456789012345678901234567890",
      name: "Momentum Trader",
      venue: "GMX",
      status: "ACTIVE",
      weights: [15, 20, 15, 20, 10, 5, 10, 5],
      apr30d: 42.5,
      apr90d: 38.2,
      aprSi: 45.1,
      sharpe30d: 1.85,
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { id: "agent-2-volatility-hl" },
    update: {},
    create: {
      id: "agent-2-volatility-hl",
      creatorWallet: "0x2345678901234567890123456789012345678901",
      name: "Volatility Hunter",
      venue: "HYPERLIQUID",
      status: "ACTIVE",
      weights: [10, 15, 20, 25, 10, 10, 5, 5],
      apr30d: 38.2,
      apr90d: 35.7,
      aprSi: 40.3,
      sharpe30d: 1.62,
    },
  });

  const agent3 = await prisma.agent.upsert({
    where: { id: "agent-3-trend-spot" },
    update: {},
    create: {
      id: "agent-3-trend-spot",
      creatorWallet: "0x3456789012345678901234567890123456789012",
      name: "Trend Follower",
      venue: "SPOT",
      status: "ACTIVE",
      weights: [20, 10, 15, 15, 10, 10, 15, 5],
      apr30d: 35.7,
      apr90d: 32.4,
      aprSi: 37.8,
      sharpe30d: 1.54,
    },
  });

  console.log("Creating Agent Deployments...");
  const deployment1 = await prisma.agentDeployment.upsert({
    where: { id: "deployment-1" },
    update: {},
    create: {
      id: "deployment-1",
      agentId: agent1.id,
      userWallet: "0x4567890123456789012345678901234567890123",
      safeWallet: "0xSAFE1111111111111111111111111111111111",
      status: "ACTIVE",
      subActive: true,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  const deployment2 = await prisma.agentDeployment.upsert({
    where: { id: "deployment-2" },
    update: {},
    create: {
      id: "deployment-2",
      agentId: agent2.id,
      userWallet: "0x5678901234567890123456789012345678901234",
      safeWallet: "0xSAFE2222222222222222222222222222222222",
      status: "ACTIVE",
      subActive: true,
    },
  });

  const deployment3 = await prisma.agentDeployment.upsert({
    where: { id: "deployment-3" },
    update: {},
    create: {
      id: "deployment-3",
      agentId: agent3.id,
      userWallet: "0x6789012345678901234567890123456789012345",
      safeWallet: "0xSAFE3333333333333333333333333333333333",
      status: "PAUSED",
      subActive: false,
    },
  });

  console.log("Creating Venue Status entries...");
  const tokens = ["BTC", "ETH", "SOL", "ARB", "AVAX"];
  const venues: ("GMX" | "HYPERLIQUID" | "SPOT")[] = ["GMX", "HYPERLIQUID", "SPOT"];

  for (const venue of venues) {
    for (const token of tokens) {
      await prisma.venueStatus.upsert({
        where: {
          venue_tokenSymbol: {
            venue,
            tokenSymbol: token,
          },
        },
        update: {},
        create: {
          venue,
          tokenSymbol: token,
          minSize: venue === "GMX" ? "0.001" : venue === "HYPERLIQUID" ? "0.0001" : "0.01",
          tickSize: venue === "GMX" ? "0.01" : venue === "HYPERLIQUID" ? "0.1" : "0.001",
          slippageLimitBps: 100,
        },
      });
    }
  }

  console.log("Creating Token Registry entries...");
  await prisma.tokenRegistry.upsert({
    where: {
      chain_tokenSymbol: {
        chain: "ethereum",
        tokenSymbol: "USDC",
      },
    },
    update: {},
    create: {
      chain: "ethereum",
      tokenSymbol: "USDC",
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      preferredRouter: "uniswap-v3",
    },
  });

  await prisma.tokenRegistry.upsert({
    where: {
      chain_tokenSymbol: {
        chain: "ethereum",
        tokenSymbol: "WETH",
      },
    },
    update: {},
    create: {
      chain: "ethereum",
      tokenSymbol: "WETH",
      tokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      preferredRouter: "uniswap-v3",
    },
  });

  console.log("✅ Seeding complete!");
  console.log(`Created ${tokens.length * venues.length} VenueStatus entries`);
  console.log("Created 3 Agents, 3 Deployments, 3 CT Accounts, 2 Token Registry entries");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
