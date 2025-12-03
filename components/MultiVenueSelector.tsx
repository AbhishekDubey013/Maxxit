/**
 * Multi-Venue Selector Modal
 * Direct action buttons for each venue - user clicks and immediately whitelists
 * 
 * NEW BEHAVIOR:
 * - If user already has addresses → skip modal → create deployments directly
 * - If user is new → show venue selector → guide through setup
 */

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X, Zap, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { HyperliquidConnect } from './HyperliquidConnect';
import { OstiumConnect } from './OstiumConnect';

interface MultiVenueSelectorProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onComplete: () => void;
}

export function MultiVenueSelector({
  agentId,
  agentName,
  onClose,
  onComplete,
}: MultiVenueSelectorProps) {
  const { authenticated, user, login } = usePrivy();
  const [hyperliquidModalOpen, setHyperliquidModalOpen] = useState(false);
  const [ostiumModalOpen, setOstiumModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingDeployments, setCreatingDeployments] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{
    hasHyperliquid: boolean;
    hasOstium: boolean;
  } | null>(null);

  // Check if user already has addresses on mount
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      checkSetupStatus();
    } else if (authenticated === false) {
      // User is definitely not authenticated - show login prompt
      setLoading(false);
    }
    // If authenticated is undefined/null, keep loading (waiting for auth state)
  }, [authenticated, user?.wallet?.address]);

  const checkSetupStatus = async () => {
    if (!user?.wallet?.address) {
      console.log('[MultiVenueSelector] No wallet address - skipping check');
      return;
    }

    console.log('[MultiVenueSelector] 🔍 Checking setup status for:', user.wallet.address);

    try {
      // CRITICAL FIX: Pass agentId to check deployments for THIS specific agent
      // Not just if addresses exist (addresses can exist but not be whitelisted)
      const response = await fetch(`/api/user/check-setup-status?userWallet=${user.wallet.address}&agentId=${agentId}`);

      console.log('[MultiVenueSelector] API response status:', response.status);

      if (response.ok) {
        const data = await response.json();

        console.log('[MultiVenueSelector] Setup status:', {
          hasHyperliquidAddress: data.hasHyperliquidAddress,
          hasOstiumAddress: data.hasOstiumAddress,
          hasHyperliquidDeployment: data.hasHyperliquidDeployment,
          hasOstiumDeployment: data.hasOstiumDeployment,
          addresses: data.addresses,
        });

        // Use deployment status (actual whitelisting) not just address existence
        const hasHyperliquid = data.hasHyperliquidDeployment || false;
        const hasOstium = data.hasOstiumDeployment || false;

        setSetupStatus({
          hasHyperliquid,
          hasOstium,
        });

        // CRITICAL FIX: Only auto-create if BOTH deployments exist for THIS agent
        // Don't auto-create just because addresses exist (user might not have whitelisted)
        if (hasHyperliquid && hasOstium) {
          console.log('[MultiVenueSelector] ✅ User has both deployments for this agent - skipping selector');
          // Both already deployed - just close
          setTimeout(() => {
            onComplete();
          }, 500);
        } else {
          // User needs to whitelist one or both venues - show selector
          console.log('[MultiVenueSelector] ⚠️  User needs to complete venue setup');
          console.log('  - Hyperliquid:', hasHyperliquid ? '✅ Deployed' : '❌ Needs setup');
          console.log('  - Ostium:', hasOstium ? '✅ Deployed' : '❌ Needs setup');
          setLoading(false);
        }
      } else {
        console.error('[MultiVenueSelector] API error:', response.status, response.statusText);
        setLoading(false);
      }
    } catch (err) {
      console.error('[MultiVenueSelector] Error checking setup status:', err);
      setLoading(false);
    }
  };

  const createBothDeploymentsDirectly = async (wallet: string) => {
    setCreatingDeployments(true);

    try {
      // Create Hyperliquid deployment
      const hlResponse = await fetch('/api/hyperliquid/create-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, userWallet: wallet }),
      });

      // Create Ostium deployment
      const ostiumResponse = await fetch('/api/ostium/create-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, userWallet: wallet }),
      });

      if (hlResponse.ok && ostiumResponse.ok) {
        console.log('[MultiVenueSelector] ✅ Both deployments created successfully');

        // Show success briefly then complete
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        throw new Error('Failed to create deployments');
      }
    } catch (err: any) {
      console.error('Error creating deployments:', err);
      // Fall back to showing the selector
      setLoading(false);
      setCreatingDeployments(false);
    }
  };

  const venues = [
    {
      id: 'HYPERLIQUID',
      name: 'Hyperliquid',
      description: 'Perpetual futures trading with agent whitelisting',
    },
    {
      id: 'OSTIUM',
      name: 'Ostium',
      description: 'Arbitrum perpetuals with low gas fees',
    },
    {
      id: 'SPOT',
      name: 'SPOT (Coming Soon)',
      description: 'Spot trading on decentralized exchanges',
      disabled: true,
    },
  ];

  const handleVenueClick = (venueId: string) => {
    if (!authenticated) {
      login();
      return;
    }

    if (venueId === 'HYPERLIQUID') {
      setHyperliquidModalOpen(true);
    } else if (venueId === 'OSTIUM') {
      setOstiumModalOpen(true);
    }
  };

  // If not authenticated, show login prompt instead of venue selector
  if (!authenticated && !loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-card border border-border/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
          <div className="relative p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-center shadow-lg shadow-primary/10">
                <Zap className="h-9 w-9 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to continue deploying <span className="font-semibold text-foreground">{agentName}</span> across venues.
                </p>
              </div>
            </div>

            {/* Mini step indicator */}
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/25 text-primary text-[10px] font-semibold">
                  1
                </span>
                <span>Connect wallet</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 text-muted-foreground text-[10px] font-semibold">
                  2
                </span>
                <span>Choose venues</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 text-muted-foreground text-[10px] font-semibold">
                  3
                </span>
                <span>Deploy agent</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => login()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                <Zap className="h-4 w-4" />
                Connect Wallet
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border border-border rounded-lg font-medium text-sm text-muted-foreground hover:bg-accent/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading or success state while creating deployments
  if (loading || creatingDeployments) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-card border border-border/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
          {/* Animated top progress bar (solid color, no gradient) */}
          <div className="h-1 w-full bg-border/60 overflow-hidden">
            <div
              className={`h-full w-1/2 bg-primary/70 animate-[shimmer_1.4s_ease-in-out_infinite]`}
            />
          </div>

          <div className="relative p-8">
            <div className="flex flex-col items-center text-center space-y-5">
              {creatingDeployments ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center animate-in fade-in zoom-in-95">
                    <CheckCircle className="h-9 w-9 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Agent Deployed 🎉</h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{agentName}</span> is now active on Hyperliquid and Ostium.
                      <br />
                      Signals will begin executing in real time.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-muted/40 border border-border/70 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Checking your setup…</h3>
                    <p className="text-sm text-muted-foreground">
                      Looking for existing deployments and venue connections for{' '}
                      <span className="font-semibold text-foreground">{agentName}</span>.
                    </p>
                  </div>
                </>
              )}

              {/* Step timeline visual */}
              <div className="w-full max-w-md mx-auto mt-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-primary/20 text-primary border border-primary/40">
                      1
                    </div>
                    <span>Check status</span>
                  </div>
                  <div className="flex-1 h-px mx-2 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-muted/40 text-muted-foreground border border-border/60">
                      2
                    </div>
                    <span>Deploy venues</span>
                  </div>
                  <div className="flex-1 h-px mx-2 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-muted/40 text-muted-foreground border border-border/60">
                      3
                    </div>
                    <span>Start trading</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-card border border-border/80 rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] w-full overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">

          {/* Header */}
          <div className="relative border-b border-border/80 px-6 pt-6 pb-4 bg-background/60 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                {/* <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-[9px] font-semibold">
                    {setupStatus?.hasHyperliquid || setupStatus?.hasOstium ? 2 : 1}
                  </span>
                  <span className="uppercase tracking-wide">
                    {setupStatus?.hasHyperliquid || setupStatus?.hasOstium ? 'Choose remaining venues' : 'Select trading venues'}
                  </span>
                </div> */}

                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {setupStatus?.hasHyperliquid || setupStatus?.hasOstium
                      ? 'Complete Venue Setup'
                      : 'Connect Trading Venues'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {setupStatus?.hasHyperliquid && setupStatus?.hasOstium
                      ? 'Both venues are already deployed for this agent. You can still review or update deployments below.'
                      : setupStatus?.hasHyperliquid && !setupStatus?.hasOstium
                        ? 'Hyperliquid is active. Setup Ostium to unlock multi-venue routing.'
                        : setupStatus?.hasOstium && !setupStatus?.hasHyperliquid
                          ? 'Ostium is active. Setup Hyperliquid to unlock multi-venue routing.'
                          : `Select where ${agentName} is allowed to execute trades.`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-border/70 bg-background/60 p-2 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Compact step timeline */}
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/25 text-primary text-[10px] font-semibold">
                  1
                </span>
                <span>Connect wallet</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent mx-1" />
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/25 text-primary text-[10px] font-semibold">
                  2
                </span>
                <span>Choose venues</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent mx-1" />
              <div className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 text-muted-foreground text-[10px] font-semibold">
                  3
                </span>
                <span>Start trading</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-6 space-y-5 overflow-y-auto">
            {/* Show info banner based on setup status */}
            {setupStatus?.hasHyperliquid && setupStatus?.hasOstium ? (
              <div className="bg-muted/40 border border-border/70 rounded-lg p-4 mb-2">
                <p className="text-sm text-emerald-300 font-medium">
                  ✅ Both venues are already deployed for this agent!
                </p>
              </div>
            ) : setupStatus?.hasHyperliquid || setupStatus?.hasOstium ? (
              <div className="bg-muted/40 border border-border/70 rounded-lg p-4 mb-2">
                <p className="text-sm text-muted-foreground font-medium">
                  ℹ️ {setupStatus.hasHyperliquid ? 'Hyperliquid' : 'Ostium'} is already deployed for this agent. Click the other venue to complete multi-venue setup.
                </p>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border/70 rounded-lg p-4 mb-2">
                <p className="text-sm text-muted-foreground font-medium">
                  ℹ️ This is a multi-venue agent. Click each venue to whitelist the agent and start trading.
                </p>
              </div>
            )}

            {venues.map((venue, index) => {
              const isAlreadySetup =
                (venue.id === 'HYPERLIQUID' && setupStatus?.hasHyperliquid) ||
                (venue.id === 'OSTIUM' && setupStatus?.hasOstium);

              return (
                <button
                  key={venue.id}
                  onClick={() => !venue.disabled && !isAlreadySetup && handleVenueClick(venue.id)}
                  disabled={venue.disabled || isAlreadySetup}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`w-full p-5 rounded-xl border border-border/70 bg-card/80 transition-all text-left hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in slide-in-from-bottom duration-300 ${isAlreadySetup ? 'ring-1 ring-emerald-500/60' : ''
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border/70 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{venue.name}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {venue.description}
                          </p>
                        </div>
                      </div>

                      {!venue.disabled && (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span>Agent whitelisting on {venue.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span>Trade with your funds - non-custodial</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span>Real-time signal execution</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      {venue.disabled ? (
                        <div className="px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                          Soon
                        </div>
                      ) : isAlreadySetup ? (
                        <div className="px-5 py-2 bg-emerald-500/15 border border-emerald-500/60 text-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-300" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all"
                        >
                          <span>Setup</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* How it works - inline symmetric section */}
            <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    ℹ️
                  </span>
                  <span className="text-sm font-semibold text-foreground">How it works</span>
                </div>
              </div>
              <ol className="grid gap-1 md:grid-cols-2 list-decimal list-inside">
                <li>Click a venue card above to open setup.</li>
                <li>Whitelist the agent so it can trade on your behalf.</li>
                <li>Agent executes signals automatically on connected venues.</li>
                <li>Review deployments and trades in “My Deployments”.</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="relative border-t border-border/80 p-6 bg-background/80 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 border border-border rounded-lg font-medium text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Hyperliquid Setup Modal */}
      {hyperliquidModalOpen && (
        <HyperliquidConnect
          agentId={agentId}
          agentName={agentName}
          agentVenue="MULTI"
          onClose={() => setHyperliquidModalOpen(false)}
          onSuccess={() => {
            setHyperliquidModalOpen(false);
            // Refresh setup status
            if (user?.wallet?.address) {
              checkSetupStatus();
            }
          }}
        />
      )}

      {/* Ostium Setup Modal */}
      {ostiumModalOpen && (
        <OstiumConnect
          agentId={agentId}
          agentName={agentName}
          onClose={() => setOstiumModalOpen(false)}
          onSuccess={() => {
            setOstiumModalOpen(false);
            // Refresh setup status
            if (user?.wallet?.address) {
              checkSetupStatus();
            }
          }}
        />
      )}
    </>
  );
}

