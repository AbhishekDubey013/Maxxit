import { Tooltip } from './Tooltip';
import { TrendingUp, Zap, Globe, Shield } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  venue: string;
  apr30d: number | null;
  apr90d: number | null;
  aprSi: number | null;
  sharpe30d: number | null;
}

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const hasApr = agent.apr30d != null;

  return (
    <div className="group relative">
      {/* Subtle glow effect on hover - darker and more subtle */}
      <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>

      {/* Main Card - Darker background */}
      <div
        onClick={onClick}
        className="relative bg-card/90 border border-border/80 rounded-2xl cursor-pointer transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:-translate-y-1 h-full flex flex-col"
        data-testid={`card-agent-${agent.id}`}
      >
        {/* Subtle accent bar at top - darker */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-40 group-hover:opacity-60 transition-opacity rounded-t-2xl overflow-hidden"></div>

        <div className="p-4 flex flex-col h-full">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {/* Agent Name */}
              <h3
                className="text-base font-bold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/90 transition-colors duration-300"
                data-testid={`text-name-${agent.id}`}
              >
                {agent.name}
              </h3>

              {/* Venue Badge - darker styling */}
              {agent.venue === 'MULTI' ? (
                <Tooltip content="Agent Where: Automatically routes trades to the best available venue (Hyperliquid → Ostium)">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/60 border border-border/80 cursor-help hover:border-primary/30 transition-all">
                    <Globe className="h-3 w-3 text-primary/70" />
                    <span className="text-[10px] font-semibold text-foreground/90">Multi-Venue</span>
                    <span className="text-[10px] text-muted-foreground/70">(261 pairs)</span>
                  </div>
                </Tooltip>
              ) : (
                <div className="inline-flex items-center px-2 py-1 rounded-lg bg-muted/60 border border-border/80">
                  <span className="text-[10px] font-semibold text-muted-foreground">{agent.venue}</span>
                </div>
              )}
            </div>

            {/* APR Display - Right aligned - darker accent */}
            <div className="text-right flex-shrink-0">
              <div className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">
                APR (30d)
              </div>
              {hasApr && agent.apr30d != null ? (
                <div className="text-2xl font-bold text-primary/90 group-hover:scale-105 transition-transform duration-300" data-testid={`text-apr30d-${agent.id}`}>
                  {agent.apr30d.toFixed(1)}%
                </div>
              ) : (
                <div className="text-lg font-semibold text-muted-foreground/40">N/A</div>
              )}
            </div>
          </div>

          {/* Bottom Row - Stats & Badges */}
          <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            {/* Feature Badges - darker styling */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tooltip content="We relay transactions and charge a flat $0.20 per trade">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-muted/50 text-muted-foreground border border-border/70 cursor-help hover:bg-muted/60 hover:border-primary/30 transition-all">
                  <Zap className="h-2.5 w-2.5 text-primary/70" />
                  Gasless
                </span>
              </Tooltip>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-muted/50 text-muted-foreground border border-border/70">
                <Shield className="h-2.5 w-2.5 text-muted-foreground/70" />
                Non-custodial
              </span>
            </div>

            {/* Sharpe Ratio - darker */}
            {/* {agent.sharpe30d != null && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/60 flex-shrink-0">
                <span className="text-[9px] font-medium text-muted-foreground/70">Sharpe</span>
                <span className="text-xs font-bold text-foreground/90">{agent.sharpe30d.toFixed(2)}</span>
              </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
