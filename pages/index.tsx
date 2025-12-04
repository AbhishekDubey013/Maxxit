import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '../client/src/lib/db';
import { AgentCard } from '@components/AgentCard';
import { AgentDrawer } from '@components/AgentDrawer';
import { HyperliquidConnect } from '@components/HyperliquidConnect';
import { MultiVenueSelector } from '@components/MultiVenueSelector';
import { Bot, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import { Header } from '@components/Header';
import ColorBends from '@components/ColorBends';
// import ColorBends from '@components/ColorBends';

interface Agent {
  id: string;
  name: string;
  venue: string;
  apr30d: number | null;
  apr90d: number | null;
  aprSi: number | null;
  sharpe30d: number | null;
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hyperliquidModalOpen, setHyperliquidModalOpen] = useState(false);
  const [hyperliquidAgentId, setHyperliquidAgentId] = useState<string>('');
  const [hyperliquidAgentName, setHyperliquidAgentName] = useState<string>('');
  const [multiVenueSelectorOpen, setMultiVenueSelectorOpen] = useState(false);
  const [multiVenueAgent, setMultiVenueAgent] = useState<{ id: string; name: string } | null>(null);

  const features = [
    {
      icon: TrendingUp,
      title: "Transparent PnL",
      description: "Every trade tracked with full position history and real-time performance metrics",
      color: "emerald",
      position: "top"
    },
    {
      icon: Bot,
      title: "AI-Powered Reasoning",
      description: "Agents powered by crypto Twitter signals and technical indicators",
      color: "violet",
      position: "left"
    },
    {
      icon: Zap,
      title: "Gasless Execution",
      description: "Only $0.20 per trade with no gas fees — transparent pricing",
      color: "amber",
      position: "right"
    }
  ];

  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await db.get('agents', {
          'status': 'eq.PUBLIC', // Changed from ACTIVE to PUBLIC
          'order': 'apr30d.desc',
          'limit': '20',
          'select': 'id,name,venue,apr30d,apr90d,aprSi,sharpe30d',
        });
        setAgents(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const scrollToAgents = () => {
    document.getElementById('agents-list')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAgentClick = (agent: Agent) => {
    if (agent.venue === 'MULTI') {
      // For MULTI agents, open venue selector directly
      setMultiVenueAgent({ id: agent.id, name: agent.name });
      setMultiVenueSelectorOpen(true);
    } else {
      // For other agents, open the drawer
      setSelectedAgent(agent);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Futuristic shader background */}
        <div className="pointer-events-none absolute inset-0">
          <ColorBends
            colors={['#00140F', '#003322', '#064E3B', '#16A34A']}
            rotation={30}
            speed={0.25}
            scale={1.1}
            frequency={1.3}
            warpStrength={1.1}
            mouseInfluence={0.7}
            parallax={0.4}
            noise={0.06}
            transparent
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-24 md:py-40 text-center">
          {/* Maxxit Logo/Brand */}
          {/* <div className="mb-8 animate-in fade-in slide-in-from-top duration-300">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-2" data-testid="text-brand">
              MAXXIT
            </h2>
            <div className="h-1 w-20 bg-primary/50 mx-auto" />
          </div> */}

          {/* <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6 animate-in fade-in slide-in-from-top duration-500">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Agentic DeFi Trading</span>
          </div> */}

          <h1 className="text-5xl md:text-7xl md:pt-16 font-bold text-white mb-6 animate-in fade-in slide-in-from-top duration-700" data-testid="text-hero-title">
            DeFi Agent Marketplace
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10  py-4 leading-relaxed animate-in fade-in slide-in-from-top duration-1000">
            Deploy AI-powered trading agents differentiated by real-time crypto Twitter signals
            and technical indicators — with transparent performance tracking and gasless execution.
          </p>

          <div className="flex flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom duration-1000">
            <button
              onClick={scrollToAgents}
              className="inline-flex items-center w-fit  justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-base font-medium hover-elevate active-elevate-2 transition-all"
              data-testid="button-explore"
            >
              <TrendingUp className="h-4 w-4" />
              Explore Agents
            </button>
            <Link href="/create-agent">
              <button
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white rounded-full text-base font-medium hover-elevate active-elevate-2 transition-all"
                data-testid="link-create"
              >
                <Bot className="h-4 w-4" />
                Create Agent
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="relative pt-20 px-4 bg-gradient-to-b from-emerald-950 to-emerald-900 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="relative flex items-center justify-center min-h-[700px]">

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="relative">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 -m-8">
                  <div className="w-40 h-40 rounded-full border-2 border-dashed border-emerald-500/30 animate-spin" style={{ animationDuration: '20s' }}></div>
                </div>

                {/* Glowing circle */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-lime-500 p-[2px] shadow-2xl shadow-emerald-500/50">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-emerald-300" />
                  </div>
                </div>

                {/* Center label */}
                <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className=" text-5xl font-heading font-semibold text-white/80">Features</span>
                </div>
              </div>
            </div>

            {/* Top feature */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              {/* Connecting line */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[2px] h-32 bg-gradient-to-b from-emerald-500/50 to-transparent"></div>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>

              <div className="group relative w-72">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-emerald-400" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{features[0].title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{features[0].description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Left feature */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-24 w-32 h-[2px] bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
              <div className="absolute top-1/2 left-24 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 -translate-y-1/2"></div>

              <div className="group relative w-72">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 to-lime-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-lime-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-6 w-6 text-emerald-400" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{features[1].title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{features[1].description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right feature */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
              {/* Connecting line */}
              <div className="absolute top-1/2 right-24 w-32 h-[2px] bg-gradient-to-l from-amber-500/50 to-transparent"></div>
              <div className="absolute top-1/2 right-24 w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 -translate-y-1/2"></div>

              <div className="group relative w-72">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-6 w-6 text-amber-400" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{features[2].title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{features[2].description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated particles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2">
              <div className="absolute w-1 h-1 rounded-full bg-emerald-400 animate-ping" style={{ top: '-140px', animationDuration: '2s' }}></div>
              <div className="absolute w-1 h-1 rounded-full bg-emerald-300 animate-ping" style={{ left: '-140px', animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
              <div className="absolute w-1 h-1 rounded-full bg-amber-400 animate-ping" style={{ right: '-140px', animationDuration: '3s', animationDelay: '1s' }}></div>
            </div>

          </div>
        </div>
      </section>

      {/* Agents List */}
      <section id="agents-list" className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Active Trading Agents
            </h2>
            <p className="text-muted-foreground">
              {!loading && agents.length > 0 && `${agents.length} agents available`}
            </p>
          </div>
          <Link href="/docs">
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover-elevate transition-all" data-testid="link-docs">
              <Shield className="h-4 w-4" />
              Learn More
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4 bg-card animate-pulse">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 border rounded-lg bg-destructive/5">
            <p className="text-destructive mb-4 text-lg font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Make sure NEON_REST_URL and NEON_REST_TOKEN are configured in your environment
            </p>
            <Link href="/docs#getting-started">
              <button className="inline-flex items-center justify-center px-4 py-2 border border-border bg-background rounded-md text-sm font-medium hover-elevate active-elevate-2 transition-all" data-testid="button-setup-help">
                Setup Guide
              </button>
            </Link>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 border rounded-lg bg-muted/30">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground mb-2">No active agents yet</p>
            <p className="text-muted-foreground mb-6">
              Be the first to create a trading agent and start earning
            </p>
            <Link href="/create-agent">
              <button className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover-elevate active-elevate-2 transition-all" data-testid="button-create-first">
                Create Your First Agent
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <div
                key={agent.id}
                className="animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative">
                  <AgentCard
                    agent={agent}
                    onClick={() => handleAgentClick(agent)}
                  />
                  {/* Hyperliquid Button Overlay - Only show for non-MULTI agents */}
                  {agent.venue !== 'MULTI' && (
                    <div className="absolute bottom-4 right-4 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHyperliquidAgentId(agent.id);
                          setHyperliquidAgentName(agent.name);
                          setHyperliquidModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-lime-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                        title="Setup Hyperliquid Trading"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="hidden sm:inline">Hyperliquid</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agent Drawer */}
      {selectedAgent && (
        <AgentDrawer
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          agentVenue={selectedAgent.venue}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Hyperliquid Setup Modal */}
      {hyperliquidModalOpen && (
        <HyperliquidConnect
          agentId={hyperliquidAgentId}
          agentName={hyperliquidAgentName}
          agentVenue="HYPERLIQUID"
          onClose={() => setHyperliquidModalOpen(false)}
          onSuccess={() => {
            console.log('Hyperliquid setup complete!');
          }}
        />
      )}

      {/* Multi-Venue Selector Modal */}
      {multiVenueSelectorOpen && multiVenueAgent && (
        <MultiVenueSelector
          agentId={multiVenueAgent.id}
          agentName={multiVenueAgent.name}
          onClose={() => {
            setMultiVenueSelectorOpen(false);
            setMultiVenueAgent(null);
          }}
          onComplete={() => {
            setMultiVenueSelectorOpen(false);
            setMultiVenueAgent(null);
          }}
        />
      )}
    </div>
  );
}
