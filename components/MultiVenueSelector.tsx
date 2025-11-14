/**
 * Multi-Venue Selector Modal
 * Allows user to select which venues they want to enable for a MULTI agent
 */

import { useState } from 'react';
import { X, Check } from 'lucide-react';

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
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const venues = [
    {
      id: 'HYPERLIQUID',
      name: 'Hyperliquid',
      description: 'Perpetual futures trading on Hyperliquid',
      color: 'bg-blue-500',
    },
    {
      id: 'OSTIUM',
      name: 'Ostium',
      description: 'Perpetual trading on Arbitrum',
      color: 'bg-purple-500',
    },
    {
      id: 'SPOT',
      name: 'SPOT',
      description: 'Spot trading on decentralized exchanges',
      color: 'bg-green-500',
    },
  ];

  const toggleVenue = (venueId: string) => {
    setSelectedVenues(prev => {
      if (prev.includes(venueId)) {
        return prev.filter(v => v !== venueId);
      } else {
        return [...prev, venueId];
      }
    });
  };

  const handleDeploy = async () => {
    if (selectedVenues.length === 0) {
      setError('Please select at least one venue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get user wallet from Privy
      const { wallet } = (window as any).privy?.user || {};
      if (!wallet?.address) {
        throw new Error('Please connect your wallet first');
      }

      const response = await fetch('/api/deployments/create-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          userWallet: wallet.address,
          enabledVenues: selectedVenues,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create deployment');
      }

      // Success! Redirect to My Deployments
      window.location.href = '/my-deployments';
    } catch (err: any) {
      console.error('[MultiVenueSelector] Error:', err);
      setError(err.message || 'Failed to create deployment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Select Trading Venues</h2>
              <p className="text-muted-foreground mt-1">
                Choose which venues to enable for {agentName}
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
          <p className="text-sm text-muted-foreground mb-4">
            This is a multi-venue agent. Select which trading venues you want to connect:
          </p>

          {venues.map((venue) => {
            const isSelected = selectedVenues.includes(venue.id);
            return (
              <button
                key={venue.id}
                onClick={() => toggleVenue(venue.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>

                  {/* Venue Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${venue.color}`} />
                      <h3 className="font-semibold text-lg">{venue.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {venue.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {selectedVenues.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Selected {selectedVenues.length} venue(s):</strong>{' '}
                {selectedVenues.join(', ')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                You can set up each venue from the "My Deployments" page after deployment.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={loading || selectedVenues.length === 0}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deploying...' : `Deploy to ${selectedVenues.length || 0} Venue(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

