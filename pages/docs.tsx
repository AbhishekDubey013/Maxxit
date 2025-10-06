import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Wallet, Shield, DollarSign, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Header } from '@components/Header';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: BookOpen },
    { id: 'getting-started', title: 'Getting Started', icon: Zap },
    { id: 'agents', title: 'Creating Agents', icon: TrendingUp },
    { id: 'billing', title: 'Billing & Fees', icon: DollarSign },
    { id: 'wallets', title: 'Safe Wallets', icon: Shield },
    { id: 'venues', title: 'Trading Venues', icon: Wallet },
    { id: 'risks', title: 'Risks & Disclaimers', icon: AlertTriangle },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: [0, 0.5, 1], rootMargin: '-100px 0px -50% 0px' }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-title">Documentation</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-subtitle">
            Everything you need to know about Maxxit DeFi
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-sm">Contents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {sections.map(({ id, title, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                      activeSection === id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover-elevate text-muted-foreground'
                    }`}
                    data-testid={`button-nav-${id}`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{title}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Overview */}
            <section id="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Overview
                  </CardTitle>
                  <CardDescription>What is Maxxit and how does it work?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    <strong>Maxxit</strong> is an agentic DeFi trading platform that enables users to deploy 
                    AI-powered trading agents that execute trades autonomously based on crypto Twitter signals 
                    and technical indicators.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">🤖 Autonomous Trading</h4>
                      <p className="text-sm text-muted-foreground">
                        Deploy agents that trade 24/7 based on configurable strategy weights
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">🔒 Non-Custodial</h4>
                      <p className="text-sm text-muted-foreground">
                        Maintain full custody through Safe wallet integration
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">📊 Multi-Venue</h4>
                      <p className="text-sm text-muted-foreground">
                        Trade across GMX, Hyperliquid, and Spot DEX venues
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">📈 Performance Tracking</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time metrics including APR and Sharpe ratio
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Getting Started */}
            <section id="getting-started">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Getting Started
                  </CardTitle>
                  <CardDescription>Deploy your first trading agent in minutes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-foreground">
                    <li>
                      <strong>Connect Your Wallet</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Connect your Ethereum wallet (MetaMask, WalletConnect, etc.) to the platform.
                      </p>
                    </li>
                    <li>
                      <strong>Browse the Marketplace</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Explore existing agents with proven track records. Review their performance 
                        metrics, strategy weights, and historical returns.
                      </p>
                    </li>
                    <li>
                      <strong>Deploy an Agent</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Choose an agent to deploy to your Safe wallet. The system will automatically 
                        install the trading module and begin executing trades.
                      </p>
                    </li>
                    <li>
                      <strong>Monitor Performance</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Track your deployments in the Creator Dashboard with real-time position updates, 
                        PnL tracking, and billing transparency.
                      </p>
                    </li>
                  </ol>
                  <Separator />
                  <div className="flex gap-3">
                    <Link href="/create-agent">
                      <Button data-testid="button-create-agent">
                        Create Your Own Agent
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline" data-testid="button-browse-agents">
                        Browse Agents
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Creating Agents */}
            <section id="agents">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Creating Agents
                  </CardTitle>
                  <CardDescription>Build your custom trading strategy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Creating a custom agent involves configuring an 8-weight strategy system that determines 
                    how the agent responds to signals and manages risk.
                  </p>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Strategy Weights (0-100)</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between p-2 border rounded">
                        <span className="text-muted-foreground">Weight 0</span>
                        <span>CT account impact factor influence</span>
                      </div>
                      <div className="flex justify-between p-2 border rounded">
                        <span className="text-muted-foreground">Weights 1-3</span>
                        <span>Technical indicator thresholds (RSI, MACD, volume)</span>
                      </div>
                      <div className="flex justify-between p-2 border rounded">
                        <span className="text-muted-foreground">Weights 4-5</span>
                        <span>Position sizing preferences</span>
                      </div>
                      <div className="flex justify-between p-2 border rounded">
                        <span className="text-muted-foreground">Weights 6-7</span>
                        <span>Risk parameters (stop-loss, take-profit)</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Choosing a Venue</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 border rounded-md">
                        <Badge className="mb-2">GMX</Badge>
                        <p className="text-xs text-muted-foreground">
                          Perpetuals trading with leverage up to 50x
                        </p>
                      </div>
                      <div className="p-3 border rounded-md">
                        <Badge className="mb-2">HYPERLIQUID</Badge>
                        <p className="text-xs text-muted-foreground">
                          High-performance perps with tight spreads
                        </p>
                      </div>
                      <div className="p-3 border rounded-md">
                        <Badge className="mb-2">SPOT</Badge>
                        <p className="text-xs text-muted-foreground">
                          Spot DEX trading via 1inch aggregation
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Billing & Fees */}
            <section id="billing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing & Fees
                  </CardTitle>
                  <CardDescription>Transparent pricing structure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit uses a transparent, performance-aligned fee structure with no hidden costs.
                  </p>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Infrastructure Fee</h4>
                        <Badge variant="secondary">$0.20 USDC per trade</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Covers gas costs, relayer execution, and platform infrastructure. 
                        Charged on every trade execution (both entry and exit).
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Profit Share</h4>
                        <Badge variant="secondary">10% of profits</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Only charged on winning trades. If a position closes at a loss, no profit share is taken. 
                        Calculated on realized PnL after closing the position.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Subscription</h4>
                        <Badge variant="secondary">$20 USDC per month</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Per active deployment. Billed monthly starting from the deployment date. 
                        Cancel anytime with no early termination fees.
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Example Fee Calculation</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Position PnL:</span>
                        <span className="text-green-600 font-medium">+$250 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Infrastructure (entry):</span>
                        <span>$0.20 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Infrastructure (exit):</span>
                        <span>$0.20 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit share (10%):</span>
                        <span>$25.00 USDC</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Net Profit:</span>
                        <span className="text-green-600">$224.60 USDC</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Safe Wallets */}
            <section id="wallets">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Safe Wallets
                  </CardTitle>
                  <CardDescription>Non-custodial execution architecture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit uses <strong>Safe</strong> (formerly Gnosis Safe) wallets to ensure you maintain 
                    full custody of your funds while enabling automated trading.
                  </p>
                  <div className="space-y-3">
                    <h4 className="font-semibold">How It Works</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                      <li>
                        You deploy an agent to your Safe wallet address
                      </li>
                      <li>
                        The platform installs a trading module on your Safe
                      </li>
                      <li>
                        The module has limited permissions to execute trades only
                      </li>
                      <li>
                        You can revoke module access anytime via Safe UI
                      </li>
                      <li>
                        Funds never leave your Safe wallet custody
                      </li>
                    </ol>
                  </div>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Benefits
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ No private key sharing required</li>
                      <li>✓ Funds remain under your control</li>
                      <li>✓ Module permissions are revocable</li>
                      <li>✓ Auditable on-chain execution</li>
                      <li>✓ Compatible with Safe's security infrastructure</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Trading Venues */}
            <section id="venues">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Trading Venues
                  </CardTitle>
                  <CardDescription>Supported exchanges and protocols</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit supports multiple trading venues with specialized adapters for each protocol.
                  </p>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">GMX</h4>
                        <Badge>Perpetuals</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Decentralized perpetuals exchange with up to 50x leverage. Low fees, deep liquidity, 
                        and support for major crypto assets.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Max Leverage:</span>
                          <span className="ml-2 font-medium">50x</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Position:</span>
                          <span className="ml-2 font-medium">$10</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Hyperliquid</h4>
                        <Badge>Perpetuals</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        High-performance perpetuals DEX with sub-second execution and tight spreads. 
                        Ideal for high-frequency strategies.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Max Leverage:</span>
                          <span className="ml-2 font-medium">20x</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Position:</span>
                          <span className="ml-2 font-medium">$5</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Spot DEX</h4>
                        <Badge>Spot</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Spot trading via 1inch DEX aggregation. Access best prices across Uniswap, 
                        Sushiswap, and other major DEXs.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Max Slippage:</span>
                          <span className="ml-2 font-medium">2%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Position:</span>
                          <span className="ml-2 font-medium">$50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Risks & Disclaimers */}
            <section id="risks">
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Risks & Disclaimers
                  </CardTitle>
                  <CardDescription>Important information before you start</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="font-semibold mb-2">⚠️ Trading involves significant risk</p>
                    <p className="text-sm text-muted-foreground">
                      Automated trading systems can experience losses. Past performance does not guarantee 
                      future results. Only invest what you can afford to lose.
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Key Risks</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Market volatility can lead to rapid losses</li>
                      <li>Smart contract risks and potential bugs</li>
                      <li>Liquidation risk when using leverage</li>
                      <li>Oracle failures or price manipulation</li>
                      <li>Network congestion affecting execution</li>
                      <li>Agent strategy may underperform in certain market conditions</li>
                    </ul>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Best Practices</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Start with small position sizes</li>
                      <li>Diversify across multiple agents and venues</li>
                      <li>Regularly monitor your deployments</li>
                      <li>Set appropriate risk parameters</li>
                      <li>Keep sufficient USDC for fees in your Safe wallet</li>
                      <li>Review agent performance before deploying</li>
                    </ul>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    <strong>Legal Disclaimer:</strong> Maxxit is a software platform that facilitates 
                    automated trading. We do not provide financial advice, investment recommendations, 
                    or guarantees of profitability. Users are responsible for their own trading decisions 
                    and risk management. By using this platform, you acknowledge and accept all risks 
                    associated with cryptocurrency trading.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
