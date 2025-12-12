/**
 * Ostium Strategies Page - Maxxit Trading Clone
 * Combines our best content with Ostium's page structure
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, ChevronRight, Bell, Menu, Plus, Bot, 
  ArrowRight, Clock, Shield, Sparkles, X,
  Zap, TrendingUp, CheckCircle, Brain, Radio, Globe, 
  Target, Activity, BarChart3, Lock, Settings,
  MessageSquare, FileText, LineChart, Users
} from 'lucide-react';

// ============================================
// OSTIUM COLOR PALETTE
// ============================================
const ostium = {
  bgDeep: '#0c0a09',
  bgCard: '#1c1917',
  bgCardHover: '#292524',
  bgInput: '#292524',
  bgInputDark: '#1c1917',
  bgElevated: '#262626',
  
  accent: '#f97316',
  accentHover: '#ea580c',
  accentGlow: 'rgba(249, 115, 22, 0.1)',
  accentBorder: 'rgba(249, 115, 22, 0.3)',
  
  liveGreen: '#22c55e',
  liveBg: 'rgba(34, 197, 94, 0.15)',
  
  textPrimary: '#fafaf9',
  textSecondary: '#a8a29e',
  textMuted: '#78716c',
  
  border: '#292524',
  borderLight: '#3f3f46',
};

// ============================================
// COMPONENTS
// ============================================

function LiveBadge() {
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: ostium.liveBg, color: ostium.liveGreen }}
    >
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ostium.liveGreen }} />
      LIVE
    </span>
  );
}

function AgentCard({ 
  name, 
  role,
  description, 
  icon: Icon,
  features,
}: {
  name: string;
  role: string;
  description: string;
  icon: any;
  features: string[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-6 rounded-xl transition-all duration-300"
      style={{ 
        background: isHovered ? ostium.bgCardHover : ostium.bgCard,
        border: `1px solid ${isHovered ? ostium.accent : ostium.border}`,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? `0 20px 40px -20px ${ostium.accentGlow}` : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: ostium.accentGlow, border: `1px solid ${ostium.accentBorder}` }}
        >
          <Icon className="w-6 h-6" style={{ color: ostium.accent }} />
        </div>
        <LiveBadge />
      </div>
      
      <div className="mb-4">
        <p className="text-xs font-bold tracking-wider mb-1" style={{ color: ostium.accent }}>
          {role}
        </p>
        <h3 className="text-xl font-bold" style={{ color: ostium.textPrimary }}>
          {name}
        </h3>
      </div>
      
      <p className="text-sm mb-4 leading-relaxed" style={{ color: ostium.textSecondary }}>
        {description}
      </p>
      
      <div className="space-y-2">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm" style={{ color: ostium.textMuted }}>
            <CheckCircle className="w-4 h-4" style={{ color: ostium.liveGreen }} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlphaSourceCard({ 
  type, 
  name, 
  description, 
  icon: Icon,
  signalCount 
}: {
  type: string;
  name: string;
  description: string;
  icon: any;
  signalCount: number;
}) {
  return (
    <div 
      className="p-4 rounded-lg flex items-start gap-4 transition-all hover:bg-white/5"
      style={{ background: ostium.bgCard, border: `1px solid ${ostium.border}` }}
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: ostium.accentGlow }}
      >
        <Icon className="w-5 h-5" style={{ color: ostium.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color: ostium.accent }}>{type}</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: ostium.bgInput, color: ostium.textMuted }}>
            {signalCount} signals/month
          </span>
        </div>
        <p className="font-medium truncate" style={{ color: ostium.textPrimary }}>{name}</p>
        <p className="text-xs" style={{ color: ostium.textMuted }}>{description}</p>
      </div>
    </div>
  );
}

function ComparisonRow({ feature, manual, ai }: { feature: string; manual: string; ai: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4 border-b" style={{ borderColor: ostium.border }}>
      <div className="text-sm font-medium" style={{ color: ostium.textPrimary }}>{feature}</div>
      <div className="text-sm text-center" style={{ color: ostium.textMuted }}>{manual}</div>
      <div className="text-sm text-center font-medium" style={{ color: ostium.accent }}>{ai}</div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function OstiumStrategies() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: ostium.bgDeep }}>
      
      {/* ========== HEADER ========== */}
      <header 
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{ background: `${ostium.bgDeep}f0`, borderColor: ostium.border }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4L12 12M12 12L20 4M12 12L4 20M12 12L20 20" 
                    stroke={ostium.accent} strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="font-bold text-lg" style={{ color: ostium.accent }}>OSTIUM</span>
              </Link>
              
              <nav className="hidden lg:flex items-center gap-1">
                {['Trade', 'Points', 'Vault', 'Referrals', 'Portfolio', 'More'].map((item) => (
                  <Link key={item} href="#"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                    style={{ color: ostium.textSecondary }}>
                    {item}
                    {item === 'Points' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{ background: ostium.accent, color: '#fff' }}>New</span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs font-mono" style={{ color: ostium.textMuted }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ostium.liveGreen }} />
                {currentTime}
              </div>
              <button className="hidden sm:flex px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-white/5"
                style={{ borderColor: ostium.border, color: ostium.textSecondary }}>Enable 1CT</button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: ostium.accent, color: '#fff' }}>
                <Plus className="w-4 h-4" />Add
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: ostium.bgCard }}>
                <span className="text-sm font-medium tabular-nums" style={{ color: ostium.textPrimary }}>7,807.02</span>
                <div className="w-5 h-5 rounded-full" style={{ background: `linear-gradient(135deg, ${ostium.accent}, #fbbf24)` }} />
              </div>
              <button className="p-2 rounded-lg hover:bg-white/5" style={{ color: ostium.textMuted }}>
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: ostium.border }}>
        <div className="absolute inset-0 opacity-30"
          style={{ 
            backgroundImage: `radial-gradient(${ostium.accent}15 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ostium.accent}30, transparent 70%)` }}
        />
        
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-sm font-bold tracking-widest mb-4" style={{ color: ostium.accent }}>
            BUILD A STRATEGY
          </p>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: ostium.textPrimary }}>
            Your Trading Clone<br />
            <span style={{ color: ostium.accent }}>On Ostium</span>
          </h1>
          
          <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: ostium.textSecondary }}>
            An AI that trades exactly like you—your risk tolerance, your position sizing, your style. 
            But it never sleeps. Feeds on 47+ alpha sources. Executes on Ostium automatically.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/my-deployments">
              <button className="group flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105"
                style={{ background: ostium.accent, color: '#fff' }}>
                Create Your Trading Clone
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold border transition-all hover:bg-white/5"
              style={{ borderColor: ostium.border, color: ostium.textPrimary }}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              How It Works
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Alpha Sources', value: '47+' },
              { label: 'Avg Win Rate', value: '68%' },
              { label: 'Ostium Pairs', value: '61' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl" style={{ background: ostium.bgCard }}>
                <p className="text-2xl font-bold" style={{ color: ostium.accent }}>{stat.value}</p>
                <p className="text-xs" style={{ color: ostium.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== COMPARISON SECTION ========== */}
      <section className="py-16 border-b" style={{ borderColor: ostium.border }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: ostium.textMuted }}>
              WHY A TRADING CLONE?
            </p>
            <h2 className="text-3xl font-bold mb-4" style={{ color: ostium.textPrimary }}>
              You Trade vs Your Trading Clone
            </h2>
          </div>
          
          <div className="rounded-xl overflow-hidden" style={{ background: ostium.bgCard, border: `1px solid ${ostium.border}` }}>
            <div className="grid grid-cols-3 gap-4 p-4 border-b" style={{ borderColor: ostium.border, background: ostium.bgInput }}>
              <div className="text-sm font-bold" style={{ color: ostium.textMuted }}>Feature</div>
              <div className="text-sm font-bold text-center" style={{ color: ostium.textMuted }}>You Trade</div>
              <div className="text-sm font-bold text-center" style={{ color: ostium.accent }}>Your Trading Clone</div>
            </div>
            
            <div className="p-4">
              <ComparisonRow feature="Alpha Sources" manual="Your research only" ai="47+ curated sources" />
              <ComparisonRow feature="Position Sizing" manual="Manual decisions" ai="Your style, automated" />
              <ComparisonRow feature="Trading Hours" manual="When you're awake" ai="24/7, never misses" />
              <ComparisonRow feature="Emotion" manual="Fear & greed" ai="Disciplined, consistent" />
              <ComparisonRow feature="Ostium Pairs" manual="Pairs you know" ai="All 61 pairs" />
              <ComparisonRow feature="Execution" manual="Manual clicks" ai="Instant, gasless" />
            </div>
          </div>
        </div>
      </section>

      {/* ========== THREE AGENTS SECTION ========== */}
      <section id="how-it-works" className="py-16 border-b" style={{ background: ostium.bgCard, borderColor: ostium.border }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: ostium.textMuted }}>
              HOW IT WORKS
            </p>
            <h2 className="text-3xl font-bold mb-4" style={{ color: ostium.textPrimary }}>
              Three Agents Create Your Trading Clone
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: ostium.textSecondary }}>
              Agent WHAT finds the alpha. Agent HOW becomes you. Agent WHERE executes on Ostium.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <AgentCard
              name="Agent WHAT"
              role="ALPHA FINDER"
              icon={Radio}
              description="Brings you the best signals from 47+ curated sources—research institutes, crypto Twitter, private Telegram. Feeds your trading clone with high-conviction opportunities."
              features={[
                '47+ curated alpha sources',
                'Real-time signal processing',
                'Filters noise, finds gems',
              ]}
            />
            
            <AgentCard
              name="Agent HOW"
              role="YOUR TRADING CLONE"
              icon={Brain}
              description="This is YOU, automated. Learns your trading style, risk tolerance, and position sizing preferences. Makes decisions exactly like you would—but 24/7 on Ostium."
              features={[
                'Learns your trading style',
                'Your risk tolerance',
                'Your position sizing logic',
              ]}
            />
            
            <AgentCard
              name="Agent WHERE"
              role="OSTIUM EXECUTOR"
              icon={Globe}
              description="Executes your clone's trades on Ostium. Routes to optimal pairs, manages gas, ensures non-custodial execution. Your clone trades Ostium, you stay in control."
              features={[
                'All 61 Ostium pairs',
                'Gasless execution',
                'Non-custodial on Ostium',
              ]}
            />
          </div>
          
          {/* Signal Flow */}
          <div className="p-6 rounded-xl" style={{ background: ostium.bgDeep, border: `1px solid ${ostium.border}` }}>
            <p className="text-xs font-bold tracking-widest mb-4 text-center" style={{ color: ostium.textMuted }}>
              SIGNAL FLOW
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: ostium.bgCard }}>
                <Radio className="w-4 h-4" style={{ color: ostium.accent }} />
                <span style={{ color: ostium.textSecondary }}>Signal: Long XAU/USD</span>
              </div>
              <ChevronRight className="w-5 h-5 hidden md:block" style={{ color: ostium.textMuted }} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: ostium.bgCard }}>
                <Brain className="w-4 h-4" style={{ color: ostium.accent }} />
                <span style={{ color: ostium.textSecondary }}>Size: 5% | 3x Leverage</span>
              </div>
              <ChevronRight className="w-5 h-5 hidden md:block" style={{ color: ostium.textMuted }} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: ostium.bgCard }}>
                <Globe className="w-4 h-4" style={{ color: ostium.accent }} />
                <span style={{ color: ostium.textSecondary }}>Execute on Ostium</span>
              </div>
              <ChevronRight className="w-5 h-5 hidden md:block" style={{ color: ostium.textMuted }} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: ostium.liveBg }}>
                <CheckCircle className="w-4 h-4" style={{ color: ostium.liveGreen }} />
                <span style={{ color: ostium.liveGreen }}>Position Open</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== ALPHA SOURCES SECTION ========== */}
      <section className="py-16 border-b" style={{ borderColor: ostium.border }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: ostium.textMuted }}>
              ALPHA SOURCES
            </p>
            <h2 className="text-3xl font-bold mb-4" style={{ color: ostium.textPrimary }}>
              Intelligence From 47+ Sources
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: ostium.textSecondary }}>
              Curated signals from research institutes, crypto Twitter, and private Telegram channels.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <AlphaSourceCard
              type="RESEARCH"
              name="DeFi Research Institute"
              description="Institutional-grade macro analysis"
              icon={FileText}
              signalCount={12}
            />
            <AlphaSourceCard
              type="TWITTER"
              name="@MacroAlpha"
              description="RWA and forex signal specialist"
              icon={MessageSquare}
              signalCount={28}
            />
            <AlphaSourceCard
              type="TELEGRAM"
              name="Gold & Commodities Pro"
              description="Premium commodity signals"
              icon={Radio}
              signalCount={18}
            />
            <AlphaSourceCard
              type="RESEARCH"
              name="Crypto Quant Lab"
              description="Quantitative crypto signals"
              icon={LineChart}
              signalCount={35}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: ostium.textMuted }}>
              + 43 more sources covering forex, commodities, indices, and crypto
            </p>
          </div>
        </div>
      </section>

      {/* ========== PERFORMANCE STATS ========== */}
      <section className="py-16 border-b" style={{ background: ostium.bgCard, borderColor: ostium.border }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: ostium.textMuted }}>
              PERFORMANCE
            </p>
            <h2 className="text-3xl font-bold" style={{ color: ostium.textPrimary }}>
              Results That Speak
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg 30D Return', value: '+47%', icon: TrendingUp },
              { label: 'Win Rate', value: '68%', icon: Target },
              { label: 'Max Drawdown', value: '-12%', icon: Shield },
              { label: 'Active Clones', value: '156', icon: Bot },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="p-5 rounded-xl text-center"
                style={{ background: ostium.bgDeep, border: `1px solid ${ostium.border}` }}
              >
                <stat.icon className="w-6 h-6 mx-auto mb-3" style={{ color: ostium.accent }} />
                <p className="text-3xl font-bold mb-1" style={{ color: ostium.textPrimary }}>{stat.value}</p>
                <p className="text-sm" style={{ color: ostium.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SECURITY SECTION ========== */}
      <section className="py-16 border-b" style={{ borderColor: ostium.border }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold tracking-widest mb-4" style={{ color: ostium.textMuted }}>
                SECURITY
              </p>
              <h2 className="text-3xl font-bold mb-6" style={{ color: ostium.textPrimary }}>
                Non-Custodial. Always.
              </h2>
              <p className="text-lg mb-8 leading-relaxed" style={{ color: ostium.textSecondary }}>
                Your funds never leave your wallet. Agents trade on your behalf through 
                Ostium's delegation system. You can revoke access anytime.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Lock, text: 'Funds stay in your wallet' },
                  { icon: Shield, text: 'Agent can trade, never withdraw' },
                  { icon: Settings, text: 'Revoke access anytime' },
                  { icon: CheckCircle, text: 'Audited smart contracts' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: ostium.accentGlow }}>
                      <item.icon className="w-5 h-5" style={{ color: ostium.accent }} />
                    </div>
                    <span className="font-medium" style={{ color: ostium.textPrimary }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 rounded-xl" style={{ background: ostium.bgCard, border: `1px solid ${ostium.border}` }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: ostium.liveBg }}>
                  <Lock className="w-8 h-8" style={{ color: ostium.liveGreen }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: ostium.textPrimary }}>
                  Your Keys, Your Crypto
                </h3>
                <p className="text-sm" style={{ color: ostium.textSecondary }}>
                  We never touch your private keys
                </p>
              </div>
              
              <div className="p-4 rounded-lg text-sm font-mono" style={{ background: ostium.bgDeep }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: ostium.textMuted }}>Delegation:</span>
                  <span style={{ color: ostium.liveGreen }}>Trade Only</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: ostium.textMuted }}>Withdrawals:</span>
                  <span style={{ color: '#ef4444' }}>Blocked</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: ostium.textMuted }}>Control:</span>
                  <span style={{ color: ostium.accent }}>You</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-20" style={{ background: ostium.bgCard }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: ostium.accentGlow, border: `1px solid ${ostium.accentBorder}` }}>
            <Bot className="w-4 h-4" style={{ color: ostium.accent }} />
            <span className="text-sm font-bold" style={{ color: ostium.accent }}>START NOW</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-6" style={{ color: ostium.textPrimary }}>
            Ready to Deploy Your <span style={{ color: ostium.accent }}>Trading Clone</span>?
          </h2>
          
          <p className="text-xl mb-10 leading-relaxed" style={{ color: ostium.textSecondary }}>
            Set your risk profile, connect your wallet, approve Ostium delegation. 
            Your clone starts trading in your style—24/7.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/my-deployments">
              <button className="group flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105"
                style={{ background: ostium.accent, color: '#fff' }}>
                <Bot className="w-5 h-5" />
                Create Your Trading Clone
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/docs">
              <button className="px-8 py-4 rounded-xl text-lg font-bold border transition-all hover:bg-white/5"
                style={{ borderColor: ostium.border, color: ostium.textPrimary }}>
                Read Documentation
              </button>
            </Link>
          </div>
          
          <p className="mt-8 text-sm" style={{ color: ostium.textMuted }}>
            Non-custodial • You stay in control • Cancel anytime
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-8 border-t" style={{ borderColor: ostium.border }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 4L12 12M12 12L20 4M12 12L4 20M12 12L20 20" 
                stroke={ostium.accent} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="font-bold" style={{ color: ostium.accent }}>OSTIUM</span>
          </div>
          <p className="text-xs text-center" style={{ color: ostium.textMuted }}>
            Trading involves risk. Past performance ≠ future results.
          </p>
          <p className="text-xs" style={{ color: ostium.textMuted }}>© 2025</p>
        </div>
      </footer>
    </div>
  );
}
