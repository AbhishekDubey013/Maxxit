/**
 * Multi-Venue Selector Modal
 * Direct action buttons for each venue - user clicks and immediately whitelists
 */

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X, Zap, ArrowRight } from 'lucide-react';
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
  const { authenticated, login } = usePrivy();
  const [hyperliquidModalOpen, setHyperliquidModalOpen] = useState(false);
  const [ostiumModalOpen, setOstiumModalOpen] = useState(false);

  const venues = [
    {
      id: 'HYPERLIQUID',
      name: 'Hyperliquid',
      description: 'Perpetual futures trading with agent whitelisting',
      gradient: 'from-purple-600 to-blue-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    {
      id: 'OSTIUM',
      name: 'Ostium',
      description: 'Arbitrum perpetuals with low gas fees',
      gradient: 'from-blue-600 to-cyan-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      id: 'SPOT',
      name: 'SPOT (Coming Soon)',
      description: 'Spot trading on decentralized exchanges',
      gradient: 'from-green-600 to-emerald-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Setup Trading Venues</h2>
                <p className="text-muted-foreground mt-1">
                  Connect {agentName} to trading platforms
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className={`${venues[0].bgColor} border ${venues[0].borderColor} rounded-lg p-4 mb-4`}>
              <p className="text-sm ${venues[0].textColor} font-medium">
                ℹ️ This is a multi-venue agent. Click each venue to whitelist the agent and start trading.
              </p>
            </div>

            {venues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => !venue.disabled && handleVenueClick(venue.id)}
                disabled={venue.disabled}
                className={`w-full p-6 rounded-lg border-2 transition-all text-left hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${venue.borderColor} hover:border-primary`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${venue.gradient} flex items-center justify-center`}>
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {venue.description}
                        </p>
                      </div>
                    </div>
                    
                    {!venue.disabled && (
                      <div className="ml-13 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Agent whitelisting on {venue.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Trade with your funds - non-custodial</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
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
                    ) : (
                      <div className={`px-5 py-3 bg-gradient-to-r ${venue.gradient} text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow`}>
                        <span>Setup</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-semibold mb-2">How it works:</p>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Click a venue button above to start setup</li>
                <li>Whitelist the agent to trade on your behalf</li>
                <li>Agent executes signals automatically</li>
                <li>View all trades in "My Deployments"</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-6">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
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
          onClose={() => setHyperliquidModalOpen(false)}
          onSuccess={() => {
            setHyperliquidModalOpen(false);
            onComplete();
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
            onComplete();
          }}
        />
      )}
    </>
  );
}

