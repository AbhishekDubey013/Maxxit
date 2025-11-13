import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import { Header } from '@components/Header';

interface V3Agent {
  id: string;
  name: string;
  venue: string;
  apr30d: number | null;
  apr90d: number | null;
  aprSi: number | null;
  sharpe30d: number | null;
  creatorWallet: string;
}

export default function V3Home() {
  const [agents, setAgents] = useState<V3Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchV3Agents() {
      try {
        // Query V3 agents using the dedicated V3 API endpoint
        const response = await fetch('/api/v3/agents/list?status=ACTIVE&limit=20');
        if (!response.ok) {
          throw new Error(`Failed to fetch V3 agents: ${response.statusText}`);
        }
        const result = await response.json();
        setAgents(result.agents || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load V3 agents');
      } finally {
        setLoading(false);
      }
    }
    fetchV3Agents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* V3 Badge */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">V3 Multi-Venue Agents</span>
          <span className="text-sm opacity-90">• Intelligent Routing • HYPERLIQUID + OSTIUM</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
        </div>
        
        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <div className="mb-8 animate-in fade-in slide-in-from-top duration-300">
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
              MAXXIT V3
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto" />
          </div>
          
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Agent Where • Multi-Venue Routing</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Multi-Venue Trading Agents
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            V3 agents intelligently route trades across Hyperliquid and Ostium based on pair availability.
            Venue-agnostic signal generation with automatic execution on the best available venue.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/v3/create">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-base font-medium hover:shadow-lg transition-all">
                <Sparkles className="h-4 w-4" />
                Create V3 Agent
              </button>
            </Link>
            <Link href="/v3/docs">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white rounded-md text-base font-medium hover:shadow-lg transition-all">
                <Shield className="h-4 w-4" />
                V3 Documentation
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* V3 Features */}
      <section className="border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Intelligent Routing</h3>
              <p className="text-sm text-muted-foreground">
                Automatically routes trades to HYPERLIQUID or OSTIUM based on pair availability
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <Bot className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Venue-Agnostic Signals</h3>
              <p className="text-sm text-muted-foreground">
                Agent What generates signals without venue specification for maximum flexibility
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">261 Trading Pairs</h3>
              <p className="text-sm text-muted-foreground">
                Access 220 pairs on Hyperliquid + 41 on Ostium with automatic selection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* V3 Agents List */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              V3 Multi-Venue Agents
            </h2>
            <p className="text-muted-foreground">
              {!loading && agents.length > 0 && `${agents.length} V3 agents with intelligent routing`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4 bg-card animate-pulse">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 border rounded-lg bg-destructive/5">
            <p className="text-destructive mb-4 text-lg font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground">
              V3 agents table not found. Run: npx tsx scripts/exec-v3-sql-fixed.ts
            </p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-purple-500/30 rounded-lg bg-purple-500/5">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-purple-400" />
            <p className="text-lg font-semibold text-foreground mb-2">No V3 agents yet</p>
            <p className="text-muted-foreground mb-2">
              Be the first to create a V3 multi-venue trading agent
            </p>
            <p className="text-sm text-purple-400 mb-6">
              ✨ Automatic routing • 261 pairs • Zero overlap with V2
            </p>
            <Link href="/v3/create">
              <button className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md font-medium hover:shadow-lg transition-all">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Your First V3 Agent
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border-2 border-purple-500/20 rounded-lg p-6 bg-gradient-to-br from-purple-500/5 to-blue-500/5 hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-foreground">{agent.name}</h3>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                        MULTI
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {agent.creatorWallet.slice(0, 6)}...{agent.creatorWallet.slice(-4)}
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>

                <div className="space-y-2">
                  {agent.apr30d !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">30d APR:</span>
                      <span className={`text-sm font-semibold ${agent.apr30d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {agent.apr30d.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {agent.sharpe30d !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sharpe:</span>
                      <span className="text-sm font-semibold text-foreground">
                        {agent.sharpe30d.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-purple-500/10">
                  <Link href={`/v3/agent/${agent.id}`}>
                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-sm font-medium hover:shadow-lg transition-all">
                      <Zap className="h-4 w-4" />
                      Deploy V3 Agent
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* V3 Info Banner */}
      <section className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-y border-purple-500/20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">
              V3 is Completely Separate from V2
            </h3>
            <p className="text-muted-foreground mb-4">
              V3 agents use their own database tables with zero overlap.
              Your V2 agents continue working unchanged.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">V2: 10 agents (unchanged)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-muted-foreground">V3: {agents.length} agents (new system)</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

