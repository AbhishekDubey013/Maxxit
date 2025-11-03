import { Header } from '@components/Header';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Lock, 
  Brain, 
  BarChart3,
  Users,
  Rocket,
  Target,
  CheckCircle,
  ArrowRight,
  Globe,
  Code,
  Database,
  Cpu,
  X
} from 'lucide-react';

export default function Whitepaper() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Maxxit Platform Whitepaper
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Democratizing Algorithmic Trading Through AI-Powered, Non-Custodial Trading Agents
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Version 1.0 | Last Updated: November 2024
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Rocket className="h-8 w-8" />
              Executive Summary
            </h2>
            <p className="text-lg leading-relaxed">
              Maxxit is a revolutionary trading platform that bridges the gap between crypto Twitter (CT) signals 
              and automated trade execution. By leveraging artificial intelligence, blockchain technology, and 
              non-custodial architecture, Maxxit enables traders to create intelligent trading agents that 
              automatically execute trades based on trusted CT influencers' signals while maintaining complete 
              control of their funds.
            </p>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Target className="h-8 w-8 text-purple-600" />
            The Problem We Solve
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-red-600">Traditional Pain Points</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">❌</span>
                  <span>Manual trade execution leads to missed opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">❌</span>
                  <span>Emotional trading decisions result in losses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">❌</span>
                  <span>Difficult to follow multiple CT accounts 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">❌</span>
                  <span>Centralized platforms require custody of funds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">❌</span>
                  <span>Limited algorithmic trading access for retail traders</span>
                </li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-green-600">Maxxit Solution</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Automated trade execution in milliseconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>AI-driven decision making eliminates emotions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Monitor unlimited CT accounts simultaneously</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Non-custodial architecture - you control your funds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Enterprise-grade algorithms for everyone</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Cpu className="h-8 w-8 text-purple-600" />
            How Maxxit Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Create Agent</h3>
              <p className="text-sm text-muted-foreground">
                Create a trading agent and select CT accounts to follow
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                AI classifies tweets and scores trading signals using LunarCrush
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Auto Execute</h3>
              <p className="text-sm text-muted-foreground">
                Trades execute automatically on Hyperliquid or via Safe wallet
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">Monitor & Profit</h3>
              <p className="text-sm text-muted-foreground">
                Real-time position monitoring with automated risk management
              </p>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Zap className="h-8 w-8 text-purple-600" />
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">AI-Powered Classification</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                Advanced LLM models analyze tweets to identify genuine trading signals with high accuracy.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Sentiment analysis</li>
                <li>• Token extraction</li>
                <li>• Confidence scoring</li>
                <li>• Signal validation</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">Dynamic Position Sizing</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                LunarCrush metrics combined with AI confidence for intelligent risk management.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Social sentiment scoring</li>
                <li>• Market momentum analysis</li>
                <li>• Exponential scaling (0-10%)</li>
                <li>• Confidence multipliers</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Non-Custodial Security</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                Your funds never leave your wallet. Complete control and security at all times.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Safe wallet integration</li>
                <li>• Hyperliquid API delegation</li>
                <li>• No withdrawal permissions</li>
                <li>• Encrypted agent keys</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg">Multi-Venue Support</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                Trade across multiple venues with unified interface and management.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Hyperliquid (Perpetuals)</li>
                <li>• GMX (Perpetuals)</li>
                <li>• Spot DEX Trading</li>
                <li>• More venues coming</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-lg">Smart Risk Management</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                Automated position monitoring with intelligent exit strategies.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Real-time PnL tracking</li>
                <li>• Trailing stop loss</li>
                <li>• Take profit targets</li>
                <li>• Hard stop loss (-10%)</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">Agent Marketplace</h3>
              </div>
              <p className="text-muted-foreground mb-3">
                Discover and subscribe to top-performing agents created by expert traders.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Performance metrics</li>
                <li>• Strategy insights</li>
                <li>• One-click deployment</li>
                <li>• Community ratings</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Code className="h-8 w-8 text-purple-600" />
            Technology Stack
          </h2>
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Frontend & Infrastructure</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Next.js</strong> - React framework for web app</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>TypeScript</strong> - Type-safe development</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Vercel</strong> - Global CDN deployment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Railway</strong> - Background workers</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">Backend & Processing</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Node.js</strong> - Server runtime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>PostgreSQL</strong> - Primary database</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Prisma ORM</strong> - Type-safe database</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Python</strong> - Hyperliquid service</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">AI & Analytics</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Perplexity/OpenAI</strong> - LLM classification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>LunarCrush API</strong> - Social sentiment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>GAME SDK</strong> - Twitter data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Custom Algorithms</strong> - Position sizing</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">Blockchain & Trading</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Safe Wallet</strong> - Multi-sig wallets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Hyperliquid SDK</strong> - Perpetuals trading</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>Ethers.js</strong> - Ethereum interaction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>AES-256-GCM</strong> - Key encryption</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Database className="h-8 w-8 text-purple-600" />
            System Architecture
          </h2>
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="space-y-6">
              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="font-semibold mb-2">Tweet Ingestion Layer</h3>
                <p className="text-muted-foreground text-sm">
                  Continuously monitors selected CT accounts, ingesting tweets in real-time for processing.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
              
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold mb-2">AI Classification Engine</h3>
                <p className="text-muted-foreground text-sm">
                  LLM analyzes tweets to identify trading signals, extract tokens, determine sentiment, and assign confidence scores.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
              
              <div className="border-l-4 border-green-600 pl-4">
                <h3 className="font-semibold mb-2">Signal Generation & Scoring</h3>
                <p className="text-muted-foreground text-sm">
                  Combines LunarCrush social metrics with AI confidence to calculate optimal position size (0-10% exponential).
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
              
              <div className="border-l-4 border-orange-600 pl-4">
                <h3 className="font-semibold mb-2">Trade Execution Layer</h3>
                <p className="text-muted-foreground text-sm">
                  Executes trades via Hyperliquid API or Safe wallet module with proper validation and error handling.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
              
              <div className="border-l-4 border-red-600 pl-4">
                <h3 className="font-semibold mb-2">Position Monitoring & Management</h3>
                <p className="text-muted-foreground text-sm">
                  Real-time tracking of open positions with automated exit strategies (trailing stop, take profit, hard stop).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600" />
            Security & Non-Custodial Architecture
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-green-700 dark:text-green-400">What Agents CAN Do</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Open trading positions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Close trading positions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Manage leverage and position sizing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Execute on your behalf via delegation</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4 text-red-700 dark:text-red-400">What Agents CANNOT Do</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span><strong>Withdraw</strong> your funds (enforced on-chain)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span><strong>Transfer</strong> assets to other addresses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span><strong>Access</strong> your private keys</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span><strong>Trade</strong> for unauthorized users</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
              <p className="text-sm font-semibold text-center">
                🔒 Your funds remain in YOUR wallet at all times. You can revoke agent access anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Globe className="h-8 w-8 text-purple-600" />
            Use Cases
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Retail Traders</h3>
              <p className="text-muted-foreground text-sm">
                Follow top CT influencers without 24/7 monitoring. Automated execution ensures you never miss a signal, 
                even while sleeping or working.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Professional Traders</h3>
              <p className="text-muted-foreground text-sm">
                Create your own agents with custom strategies. Monetize your expertise by sharing agents in the marketplace 
                and earning from subscribers.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Portfolio Managers</h3>
              <p className="text-muted-foreground text-sm">
                Manage multiple strategies across different venues. Diversify risk with intelligent position sizing 
                and automated risk management.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Rocket className="h-8 w-8 text-purple-600" />
            Roadmap
          </h2>
          <div className="space-y-6">
            <div className="border-l-4 border-green-600 pl-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                  ✅ Phase 1 - Complete
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Core Platform Launch</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• AI-powered tweet classification</li>
                <li>• Hyperliquid perpetuals integration</li>
                <li>• LunarCrush scoring system</li>
                <li>• Non-custodial architecture</li>
                <li>• Agent marketplace</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-600 pl-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                  🚧 Phase 2 - In Progress
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Enhanced Features</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Advanced backtesting tools</li>
                <li>• Performance analytics dashboard</li>
                <li>• Social trading features</li>
                <li>• Mobile app (iOS & Android)</li>
                <li>• More venue integrations</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-600 pl-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                  📅 Phase 3 - Coming Soon
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Platform Expansion</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• On-chain reputation system</li>
                <li>• DAO governance token</li>
                <li>• Revenue sharing for creators</li>
                <li>• Cross-chain support</li>
                <li>• Institutional features</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-12 shadow-xl">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of traders already using Maxxit to automate their trading and maximize profits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/create-agent"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-all text-lg"
              >
                Create Your First Agent
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-all text-lg"
              >
                Explore Marketplace
              </a>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            © 2024 Maxxit. All rights reserved. | Trading involves risk. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}

