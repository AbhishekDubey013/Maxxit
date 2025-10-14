import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Wallet, Shield, DollarSign, Zap, TrendingUp, AlertTriangle, Lock, Users, Twitter } from 'lucide-react';
import { Header } from '@components/Header';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: BookOpen },
    { id: 'getting-started', title: 'Getting Started', icon: Zap },
    { id: 'non-custodial', title: 'Non-Custodial Model', icon: Lock },
    { id: 'agents', title: 'Creating Agents', icon: TrendingUp },
    { id: 'profit-sharing', title: 'Profit Sharing (20%)', icon: Users },
    { id: 'billing', title: 'Billing & Fees', icon: DollarSign },
    { id: 'wallets', title: 'Safe Wallets', icon: Shield },
    { id: 'trading', title: 'Trading System', icon: Wallet },
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
            Complete guide to Maxxit's non-custodial DeFi trading platform
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
                    <strong>Maxxit</strong> is a <strong className="text-green-600">fully non-custodial</strong> DeFi trading platform 
                    that enables users to deploy AI-powered trading agents that execute trades autonomously on <strong>your own Safe wallet</strong>. 
                    Agents monitor crypto Twitter (X) accounts for signals and execute trades 24/7 while you maintain complete control over your funds.
                  </p>
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      100% Non-Custodial
                    </h4>
                    <p className="text-sm">
                      <strong>Your funds NEVER leave your Safe wallet.</strong> Maxxit cannot access, withdraw, or transfer your assets. 
                      You maintain full custody at all times through Safe's battle-tested smart contract architecture.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">🤖 Autonomous Trading</h4>
                      <p className="text-sm text-muted-foreground">
                        Deploy agents that monitor X accounts and execute trades 24/7 based on signals from trusted crypto influencers
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">🔒 Your Wallet, Your Keys</h4>
                      <p className="text-sm text-muted-foreground">
                        Trades execute directly from your Safe wallet via secure modules. Revoke access anytime.
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">📊 Real-Time Monitoring</h4>
                      <p className="text-sm text-muted-foreground">
                        Track open positions, PnL, and agent performance with live updates and Telegram notifications
                      </p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-2">💰 20% Profit Sharing</h4>
                      <p className="text-sm text-muted-foreground">
                        Profitable trades distribute 20% to agent creators and X accounts. Only pay on wins, never on losses.
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
                  <ol className="list-decimal list-inside space-y-4 text-foreground">
                    <li>
                      <strong>Connect Your Safe Wallet</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Connect your Arbitrum Safe wallet (or create one at <a href="https://app.safe.global" target="_blank" className="text-blue-600 hover:underline">app.safe.global</a>). 
                        Fund it with USDC for trading and ETH for gas fees.
                      </p>
                    </li>
                    <li>
                      <strong>Browse the Agent Marketplace</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Explore agents created by the community. Each agent tracks specific X accounts and has its own trading strategy. 
                        Review performance metrics and the X accounts they monitor before deploying.
                      </p>
                    </li>
                    <li>
                      <strong>Enable the Trading Module</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        When you deploy an agent, you'll be prompted to enable Maxxit's trading module on your Safe. This is a <strong>one-time setup</strong> that 
                        grants limited permissions for trade execution only. The module CANNOT withdraw funds or perform any other actions.
                      </p>
                    </li>
                    <li>
                      <strong>Fund and Activate</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Approve USDC to the module and initialize capital tracking. Your agent will begin monitoring X accounts and executing trades when signals are detected.
                      </p>
                    </li>
                    <li>
                      <strong>Monitor via Telegram or Dashboard</strong>
                      <p className="ml-6 text-sm text-muted-foreground mt-1">
                        Link your Telegram to receive instant trade notifications. Use the dashboard to track open positions, PnL, and manually execute trades with commands like "Buy 10 USDC of WETH".
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

            {/* Non-Custodial Model */}
            <section id="non-custodial">
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Lock className="h-5 w-5" />
                    Non-Custodial Model
                  </CardTitle>
                  <CardDescription>Why Maxxit can never access your funds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold mb-2">🔐 Zero Custody Architecture</h4>
                    <p className="text-sm">
                      Unlike centralized exchanges (CEXs) where your funds are held in the exchange's wallets, Maxxit operates in a <strong>completely non-custodial manner</strong>. 
                      Your assets remain in <strong>your Safe wallet at all times</strong>.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">How It Works</h4>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          1
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm">Safe Module Installation</h5>
                          <p className="text-sm text-muted-foreground">
                            When you deploy an agent, you enable Maxxit's trading module on your Safe. This module has <strong>strictly limited permissions</strong>: 
                            it can ONLY execute trades via approved DEX routers (Uniswap V3). It <strong>cannot</strong> transfer tokens directly, cannot change Safe owners, 
                            and cannot perform any administrative actions.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          2
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm">On-Chain Execution</h5>
                          <p className="text-sm text-muted-foreground">
                            Every trade is executed as an on-chain transaction from <strong>your Safe wallet</strong>. The module constructs swap transactions 
                            (e.g., USDC → WETH) and executes them through the Safe's <code className="bg-muted px-1 rounded">executeFromModule</code> function. 
                            You can verify every transaction on Arbiscan.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          3
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm">Revocable Permissions</h5>
                          <p className="text-sm text-muted-foreground">
                            You can <strong>revoke the module at any time</strong> via the Safe Transaction Builder at <a href="https://app.safe.global" target="_blank" className="text-blue-600 hover:underline">app.safe.global</a>. 
                            Once disabled, Maxxit can no longer execute trades. Your funds remain in your Safe, completely under your control.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          4
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm">No Withdrawal Capability</h5>
                          <p className="text-sm text-muted-foreground">
                            The module <strong>physically cannot</strong> call token <code className="bg-muted px-1 rounded">transfer()</code> functions to send your funds to external addresses. 
                            It can only interact with approved DEX routers for swaps. Profit sharing (20%) is handled on-chain during position closing, 
                            but the bulk of your funds always remain in your Safe.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-2">📖 Compare: CEX vs Maxxit</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <h5 className="font-semibold text-red-600 mb-1">❌ Centralized Exchange (CEX)</h5>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Funds held in exchange's wallets</li>
                          <li>• Exchange controls private keys</li>
                          <li>• Risk of hacks (e.g., WazirX, FTX, Mt.Gox)</li>
                          <li>• Withdrawals can be frozen</li>
                          <li>• Must trust the platform</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-green-600 mb-1">✅ Maxxit (Non-Custodial)</h5>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Funds remain in YOUR Safe wallet</li>
                          <li>• YOU control the private keys</li>
                          <li>• No hack risk to Maxxit = no fund loss</li>
                          <li>• Withdraw anytime, no permission needed</li>
                          <li>• Trustless, on-chain execution</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Smart Contract Risk Disclosure
                    </h4>
                    <p className="text-sm">
                      While Maxxit cannot access your funds, smart contracts (Safe, Uniswap, Maxxit module) carry inherent risks including bugs, exploits, 
                      or unforeseen vulnerabilities. Maxxit's module is open-source and follows Safe's security best practices, but <strong>no smart contract 
                      is 100% risk-free</strong>. Always use funds you can afford to lose.
                    </p>
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
                    Anyone can create a trading agent on Maxxit. Agents monitor specific X (Twitter) accounts for trading signals and execute trades automatically 
                    when certain conditions are met. As an agent creator, you earn <strong>10% of all profits</strong> generated by your agent across all deployments.
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Agent Configuration</h4>
                    <div className="space-y-3">
                      <div className="p-4 border rounded-md">
                        <h5 className="font-semibold mb-2 flex items-center gap-2">
                          <Twitter className="h-4 w-4" />
                          X Account Selection
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          Choose which X accounts your agent should monitor. Agents track tweets from these accounts and use LLM-powered classification 
                          to identify potential trading signals (bullish/bearish mentions of tokens).
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-md">
                        <h5 className="font-semibold mb-2">Trading Venue</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          Currently, agents trade on <strong>SPOT</strong> venues (Uniswap V3 on Arbitrum). Agents execute swaps between USDC and supported tokens:
                        </p>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <Badge variant="outline">WETH</Badge>
                          <Badge variant="outline">WBTC</Badge>
                          <Badge variant="outline">ARB</Badge>
                          <Badge variant="outline">LINK</Badge>
                          <Badge variant="outline">UNI</Badge>
                          <Badge variant="outline">GMX</Badge>
                          <Badge variant="outline">AAVE</Badge>
                          <Badge variant="outline">CRV</Badge>
                          <Badge variant="outline">LDO</Badge>
                          <Badge variant="outline">PEPE</Badge>
                          <Badge variant="outline">PENDLE</Badge>
                          <Badge variant="outline">GRT</Badge>
                          <Badge variant="outline">MATIC</Badge>
                          <Badge variant="outline">SOL</Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-md">
                        <h5 className="font-semibold mb-2">Profit Receiver</h5>
                        <p className="text-sm text-muted-foreground">
                          Set your Arbitrum wallet address to receive <strong>10% of profits</strong> from all trades executed by your agent. 
                          This is automatically distributed on-chain when positions close in profit.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold mb-2">💡 Agent Creator Economics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Your profit share:</span>
                        <span className="font-semibold">10% of all profits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">X account profit share:</span>
                        <span className="font-semibold">10% of all profits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trader keeps:</span>
                        <span className="font-semibold text-green-600">80% of profits</span>
                      </div>
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground">
                        Example: If your agent generates $1,000 in profits across all deployments, you earn $100, 
                        the monitored X accounts earn $100, and traders keep $800.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Profit Sharing */}
            <section id="profit-sharing">
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Users className="h-5 w-5" />
                    Profit Sharing (20% Total)
                  </CardTitle>
                  <CardDescription>How profits are distributed on-chain</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit implements an <strong>on-chain profit sharing mechanism</strong> where 20% of all realized profits are automatically distributed 
                    to agent creators and the X accounts being monitored. This incentivizes quality agent creation and rewards influential crypto traders.
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Distribution Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 border rounded-md bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600 mb-1">80%</div>
                        <div className="text-sm font-semibold mb-1">Trader Keeps</div>
                        <p className="text-xs text-muted-foreground">
                          The majority of profits go to you, the trader who deployed the agent and provided the capital.
                        </p>
                      </div>
                      <div className="p-4 border rounded-md bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                        <div className="text-2xl font-bold text-purple-600 mb-1">10%</div>
                        <div className="text-sm font-semibold mb-1">Agent Creator</div>
                        <p className="text-xs text-muted-foreground">
                          Rewards the agent creator for building and maintaining the trading strategy.
                        </p>
                      </div>
                      <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-blue-600 mb-1">10%</div>
                        <div className="text-sm font-semibold mb-1">X Accounts</div>
                        <p className="text-xs text-muted-foreground">
                          Distributed to the X accounts being monitored for providing valuable signals.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">How It Works On-Chain</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>
                        <strong>Position Opens:</strong> Your Safe wallet swaps USDC for a token (e.g., WETH). Entry price is recorded.
                      </li>
                      <li>
                        <strong>Position Monitored:</strong> The system tracks price movements and applies a <strong>1% trailing stop loss</strong> 
                        (activates after +3% profit) to protect gains.
                      </li>
                      <li>
                        <strong>Position Closes:</strong> When the position exits (via trailing stop or manual close), the system calculates profit/loss.
                      </li>
                      <li>
                        <strong>Profit Distribution:</strong> If profitable, the smart contract automatically:
                        <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                          <li>Sends 10% to agent creator's wallet</li>
                          <li>Sends 10% to X account wallets (split if multiple accounts)</li>
                          <li>Keeps 80% in your Safe wallet</li>
                        </ul>
                      </li>
                      <li>
                        <strong>On Losses:</strong> No profit share is taken. 100% of the loss is borne by you (the trader).
                      </li>
                    </ol>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">📊 Example Calculation</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry:</span>
                        <span>$1,000 USDC → 0.5 WETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exit:</span>
                        <span>0.5 WETH → $1,500 USDC</span>
                      </div>
                      <div className="flex justify-between font-semibold text-green-600">
                        <span>Gross Profit:</span>
                        <span>+$500 USDC</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent creator (10%):</span>
                        <span>$50 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">X accounts (10%):</span>
                        <span>$50 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Infrastructure fee:</span>
                        <span>$0.40 USDC ($0.20 entry + $0.20 exit)</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>You Keep:</span>
                        <span className="text-green-600">$1,399.60 USDC</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Net Profit:</span>
                        <span>+$399.60 USDC (+39.96%)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Important Notes
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Profit sharing is <strong>only on realized profits</strong> when positions close in profit</li>
                      <li>• Losses are 100% borne by the trader (no profit share on losses)</li>
                      <li>• Distribution happens automatically on-chain during position closing</li>
                      <li>• All transactions are verifiable on Arbiscan</li>
                    </ul>
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
                  <CardDescription>Transparent, performance-aligned pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit uses a simple, transparent fee structure. You only pay when trades execute and when they're profitable.
                  </p>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Infrastructure Fee</h4>
                        <Badge variant="secondary">$0.20 USDC per trade</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Charged on <strong>every trade execution</strong> (both entry and exit). This flat fee covers:
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-2">
                        <li>Gas costs for on-chain execution</li>
                        <li>Backend infrastructure (workers, monitoring, Telegram bot)</li>
                        <li>API costs (LLM classification, price feeds)</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Example:</strong> Open a position = $0.20, Close a position = $0.20. Total per full trade cycle = $0.40.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Profit Share</h4>
                        <Badge variant="secondary">20% of profits (split 10%/10%)</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Only charged on <strong>winning trades</strong>. Calculated on realized PnL after closing the position:
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-2">
                        <li><strong>10%</strong> goes to the agent creator</li>
                        <li><strong>10%</strong> goes to monitored X accounts</li>
                        <li><strong>80%</strong> you keep</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>On losses:</strong> No profit share is charged. 100% of losses are borne by you.
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold mb-2">✅ No Hidden Fees</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>✓ No monthly subscription</li>
                      <li>✓ No withdrawal fees</li>
                      <li>✓ No deposit fees</li>
                      <li>✓ No maker/taker fees</li>
                      <li>✓ No liquidation fees</li>
                    </ul>
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
                  <CardDescription>Battle-tested smart contract wallet infrastructure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground">
                    Maxxit uses <strong>Safe</strong> (formerly Gnosis Safe) wallets, the most trusted smart contract wallet in DeFi with 
                    <strong> over $100 billion</strong> secured. Safe enables automated trading while you maintain full custody.
                  </p>
                  <div className="space-y-3">
                    <h4 className="font-semibold">What is Safe?</h4>
                    <p className="text-sm text-muted-foreground">
                      Safe is a programmable smart contract wallet that supports <strong>modules</strong> - authorized contracts that can execute 
                      specific actions on behalf of the Safe. Maxxit's trading module is one such module, with strictly limited permissions to only execute DEX swaps.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">How Maxxit Uses Safe</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                      <li>
                        <strong>Module Installation:</strong> You enable Maxxit's trading module on your Safe (one-time setup)
                      </li>
                      <li>
                        <strong>Limited Permissions:</strong> The module can ONLY call approved DEX routers (Uniswap V3) for swaps
                      </li>
                      <li>
                        <strong>No Fund Access:</strong> The module CANNOT transfer tokens, change owners, or perform admin actions
                      </li>
                      <li>
                        <strong>Trade Execution:</strong> When a signal triggers, the module constructs a swap transaction and executes it via <code className="bg-muted px-1 rounded">executeFromModule</code>
                      </li>
                      <li>
                        <strong>Revoke Anytime:</strong> Disable the module via Safe UI at <a href="https://app.safe.global" target="_blank" className="text-blue-600 hover:underline">app.safe.global</a>
                      </li>
                    </ol>
                  </div>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Guarantees
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ <strong>No private key sharing</strong> - Maxxit never sees your keys</li>
                      <li>✓ <strong>Funds never leave Safe</strong> - All trades execute from your wallet</li>
                      <li>✓ <strong>Module permissions revocable</strong> - Disable access anytime</li>
                      <li>✓ <strong>Auditable execution</strong> - Every transaction visible on Arbiscan</li>
                      <li>✓ <strong>Battle-tested architecture</strong> - Safe secures $100B+ in assets</li>
                    </ul>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">🔗 Useful Links</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <a href="https://app.safe.global" target="_blank" className="text-blue-600 hover:underline">
                          Create a Safe Wallet →
                        </a>
                      </div>
                      <div>
                        <a href="https://docs.safe.global" target="_blank" className="text-blue-600 hover:underline">
                          Safe Documentation →
                        </a>
                      </div>
                      <div>
                        <a href="https://arbiscan.io" target="_blank" className="text-blue-600 hover:underline">
                          Verify Transactions on Arbiscan →
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Trading System */}
            <section id="trading">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Trading System
                  </CardTitle>
                  <CardDescription>How trades are executed and monitored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Automated Trading Flow</h4>
                    <ol className="list-decimal list-inside space-y-3 text-sm">
                      <li>
                        <strong>Tweet Monitoring:</strong> Workers scan subscribed X accounts every 2 minutes for new tweets
                      </li>
                      <li>
                        <strong>LLM Classification:</strong> Claude Haiku analyzes tweets to identify trading signals (bullish/bearish token mentions)
                      </li>
                      <li>
                        <strong>Signal Generation:</strong> Valid signals are created with token, side (LONG/SHORT), and confidence score
                      </li>
                      <li>
                        <strong>Trade Execution:</strong> Agent deployments automatically execute trades on high-confidence signals via Safe module
                      </li>
                      <li>
                        <strong>Position Monitoring:</strong> Worker tracks positions every 5 minutes, applies trailing stop loss (1%, activates at +3%)
                      </li>
                      <li>
                        <strong>Auto-Close:</strong> Positions close automatically when trailing stop triggers (price drops 1% from peak after reaching +3%)
                      </li>
                    </ol>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Manual Trading via Telegram</h4>
                    <p className="text-sm text-muted-foreground">
                      Link your Telegram account to execute manual trades with natural language commands:
                    </p>
                    <div className="bg-muted p-3 rounded-lg font-mono text-sm space-y-1">
                      <div>Buy 10 USDC of WETH</div>
                      <div>Close WETH</div>
                      <div>Buy 5 USDC of ARB</div>
                      <div>Status</div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Manual trades use the same non-custodial execution (via your Safe), same profit sharing (20%), and same monitoring (1% trailing stop).
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Supported Tokens (Uniswap V3 Arbitrum)</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge>WETH</Badge>
                      <Badge>WBTC</Badge>
                      <Badge>ARB</Badge>
                      <Badge>LINK</Badge>
                      <Badge>UNI</Badge>
                      <Badge>GMX</Badge>
                      <Badge>AAVE</Badge>
                      <Badge>CRV</Badge>
                      <Badge>LDO</Badge>
                      <Badge>PEPE</Badge>
                      <Badge>PENDLE</Badge>
                      <Badge>GRT</Badge>
                      <Badge>MATIC</Badge>
                      <Badge>SOL</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All tokens have verified liquidity on Uniswap V3. Swaps execute with 0.5% slippage tolerance.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Trailing Stop Loss (1%)</h4>
                    <p className="text-sm text-muted-foreground">
                      All positions are protected by an intelligent trailing stop loss:
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          <strong>Inactive Phase:</strong> Position opens, trailing stop waits for <strong>+3% profit</strong> before activating
                        </li>
                        <li>
                          <strong>Activation:</strong> Once price reaches +3%, trailing stop activates at 1% below that price
                        </li>
                        <li>
                          <strong>Tracking:</strong> As price rises, stop loss trails 1% below the highest price reached
                        </li>
                        <li>
                          <strong>Exit:</strong> If price drops 1% from peak, position closes automatically, locking in profits
                        </li>
                      </ol>
                      <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded text-xs font-mono">
                        <div>Entry: $100</div>
                        <div className="text-muted-foreground">→ Waiting for +3% ($103)...</div>
                        <div className="text-green-600">Price hits $103 → Stop activates at $101.97</div>
                        <div className="text-green-600">Price rises to $110 → Stop moves to $108.90</div>
                        <div className="text-green-600">Price rises to $120 → Stop moves to $118.80</div>
                        <div className="text-red-600">Price drops to $118.80 → EXIT (+18.8% profit locked!)</div>
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
                  <CardDescription>Critical information before you start trading</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="font-semibold mb-2">⚠️ HIGH RISK WARNING</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Cryptocurrency trading involves substantial risk of loss.</strong> Automated trading systems can experience significant losses, 
                      especially in volatile markets. <strong>Only invest capital you can afford to lose completely.</strong> Past performance of agents 
                      does not guarantee future results. You may lose your entire investment.
                    </p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Trading Risks</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong>Market Volatility:</strong> Crypto prices can drop 20-50%+ in minutes during flash crashes</li>
                      <li><strong>Slippage:</strong> Large trades may execute at worse prices than expected due to low liquidity</li>
                      <li><strong>Failed Signals:</strong> LLM classification may misinterpret tweets, leading to bad trades</li>
                      <li><strong>Agent Performance:</strong> Strategies may underperform or fail in certain market conditions</li>
                      <li><strong>Trailing Stop Gaps:</strong> In fast-moving markets, trailing stops may exit later than intended</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Smart Contract Risks</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong>Bugs & Exploits:</strong> Smart contracts may contain undiscovered vulnerabilities</li>
                      <li><strong>Protocol Failures:</strong> Uniswap, Safe, or other protocols could be hacked or fail</li>
                      <li><strong>Upgrade Risks:</strong> Protocol upgrades may introduce new bugs or security issues</li>
                      <li><strong>Oracle Manipulation:</strong> Price feed manipulation could lead to bad trade executions</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Operational Risks</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong>Network Congestion:</strong> High Arbitrum gas fees may delay or prevent trade execution</li>
                      <li><strong>Worker Downtime:</strong> If monitoring workers fail, trailing stops may not execute</li>
                      <li><strong>API Failures:</strong> X API, LLM API, or price feed failures could disrupt trading</li>
                      <li><strong>Executor Wallet:</strong> If executor runs out of ETH for gas, trades cannot execute</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      CEX Hack Comparison (WazirX, FTX, Mt.Gox)
                    </h4>
                    <p className="text-sm mb-2">
                      In recent years, centralized exchanges have been hacked or collapsed, leading to billions in user losses:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      <li><strong>WazirX (2024):</strong> $230M stolen in hack, users' funds locked</li>
                      <li><strong>FTX (2022):</strong> $8B+ in customer deposits misappropriated, bankruptcy</li>
                      <li><strong>Mt.Gox (2014):</strong> 850,000 BTC stolen, users still recovering funds 11 years later</li>
                    </ul>
                    <p className="text-sm mt-2 font-semibold text-green-600">
                      ✅ Maxxit's Non-Custodial Advantage: If Maxxit's servers were hacked or shut down tomorrow, <strong>your funds remain 100% safe 
                      in your Safe wallet</strong>. Simply revoke the module and you have full control. No one can freeze, seize, or steal your assets.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold">Best Practices</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li>Start with small position sizes ($50-100 USDC) to test agents</li>
                      <li>Diversify across multiple agents and tokens</li>
                      <li>Monitor your deployments daily via dashboard or Telegram</li>
                      <li>Keep 10-20% of your Safe balance in USDC for fees</li>
                      <li>Ensure your Safe has ETH for gas (~0.005 ETH minimum)</li>
                      <li>Review agent performance and X accounts before deploying</li>
                      <li>Set realistic expectations - most strategies have 40-60% win rates</li>
                      <li>Revoke module access if you want to pause trading</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs text-muted-foreground">
                    <h4 className="font-semibold mb-2 text-foreground">LEGAL DISCLAIMER</h4>
                    <p className="mb-2">
                      <strong>NOT FINANCIAL ADVICE:</strong> Maxxit is a software platform that provides tools for automated trading. 
                      We do NOT provide financial advice, investment recommendations, or guarantees of profitability. All content, agents, 
                      and strategies are for informational purposes only.
                    </p>
                    <p className="mb-2">
                      <strong>USER RESPONSIBILITY:</strong> You are solely responsible for your own trading decisions, risk management, 
                      and any losses incurred. By using Maxxit, you acknowledge that you understand the risks of cryptocurrency trading 
                      and automated trading systems.
                    </p>
                    <p className="mb-2">
                      <strong>NO CUSTODY:</strong> Maxxit does not custody, control, or have access to your funds at any time. Your assets 
                      remain in your Safe wallet under your exclusive control. We are not a custodian, broker, exchange, or financial institution.
                    </p>
                    <p className="mb-2">
                      <strong>NO WARRANTIES:</strong> The platform is provided "AS IS" without warranties of any kind. We do not guarantee 
                      uptime, execution quality, or freedom from bugs. Smart contracts may contain vulnerabilities.
                    </p>
                    <p className="mb-2">
                      <strong>LIMITATION OF LIABILITY:</strong> Maxxit, its creators, and contributors shall not be liable for any losses, 
                      damages, or claims arising from your use of the platform, including but not limited to: trading losses, smart contract bugs, 
                      protocol failures, network issues, or any other technical or operational failures.
                    </p>
                    <p className="mb-2">
                      <strong>REGULATORY COMPLIANCE:</strong> Cryptocurrency regulations vary by jurisdiction. It is YOUR responsibility to 
                      ensure compliance with local laws. Maxxit is not available in restricted jurisdictions.
                    </p>
                    <p>
                      <strong>ACCEPTANCE OF RISK:</strong> By using Maxxit, you explicitly acknowledge and accept ALL risks associated with 
                      cryptocurrency trading, DeFi protocols, smart contracts, and automated trading systems. You confirm that you are trading 
                      with funds you can afford to lose completely.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

