/**
 * Ostium Connection Flow - SIMPLIFIED (Like Monolith)
 * 1. Connect wallet
 * 2. Assign agent from pool
 * 3. User signs setDelegate transaction
 * 4. Done!
 */

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X, Wallet, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { ethers } from 'ethers';

interface OstiumConnectProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// Ostium Trading Contract on Arbitrum Sepolia
const OSTIUM_TRADING_CONTRACT = '0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe';
const OSTIUM_TRADING_ABI = [
  'function setDelegate(address delegate) external',
  'function delegations(address delegator) view returns (address)',
];

export function OstiumConnect({
  agentId,
  agentName,
  onClose,
  onSuccess,
}: OstiumConnectProps) {
  const { user, authenticated, login } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  // Auto-assign agent when wallet is connected
  useEffect(() => {
    if (authenticated && user?.wallet?.address && !agentAddress && !loading) {
      assignAgent();
    }
  }, [authenticated, user?.wallet?.address]);

  const assignAgent = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('[Ostium] Assigning agent for user:', user?.wallet?.address);

      const response = await fetch('/api/ostium/deploy-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          userWallet: user?.wallet?.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign agent');
      }

      const data = await response.json();
      setAgentAddress(data.agentAddress);
      console.log('[Ostium] Agent assigned:', data.agentAddress);
    } catch (err: any) {
      console.error('[Ostium] Failed to assign agent:', err);
      setError(err.message || 'Failed to assign agent wallet');
    } finally {
      setLoading(false);
    }
  };

  const approveAgent = async () => {
    setLoading(true);
    setError('');

    try {
      if (!authenticated || !user?.wallet?.address) {
        throw new Error('Please connect your wallet');
      }

      if (!agentAddress) {
        throw new Error('Agent not assigned yet');
      }

      console.log('[Ostium] Starting approval...');
      console.log('   User:', user.wallet.address);
      console.log('   Agent:', agentAddress);

      // Get provider
      const provider = (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found. Please install MetaMask.');
      }

      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(
        OSTIUM_TRADING_CONTRACT,
        OSTIUM_TRADING_ABI,
        signer
      );

      console.log('[Ostium] Calling setDelegate...');

      // Call setDelegate (user signs this transaction)
      const tx = await contract.setDelegate(agentAddress);
      console.log('[Ostium] Transaction sent:', tx.hash);
      setTxHash(tx.hash);

      // Wait for confirmation
      console.log('[Ostium] Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('[Ostium] Confirmed! Block:', receipt.blockNumber);

      setApproved(true);
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('[Ostium] Approval error:', err);
      
      if (err.code === 4001) {
        setError('Transaction rejected by user');
      } else if (err.code === -32603) {
        setError('Transaction failed. Please try again.');
      } else {
        setError(err.message || 'Failed to approve agent');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!authenticated) {
      login();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5" />
              <h2 className="text-xl font-bold">Setup Ostium</h2>
            </div>
            <p className="text-sm text-blue-100">{agentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!approved ? (
            <>
              {/* Not Connected */}
              {!authenticated ? (
                <div className="text-center space-y-4">
                  <Wallet className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Arbitrum wallet to whitelist the agent
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </button>
                </div>
              ) : !agentAddress ? (
                /* Loading Agent */
                <div className="text-center space-y-4 py-8">
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Assigning Agent...</h3>
                    <p className="text-sm text-muted-foreground">
                      Getting your agent wallet from the pool
                    </p>
                  </div>
                </div>
              ) : (
                /* Ready to Approve */
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                      🤖 Agent Assigned
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                      {agentAddress}
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-semibold mb-2">What happens next:</p>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">1.</span>
                      <span>Click "Approve Agent" below</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">2.</span>
                      <span>Sign the transaction in your wallet</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">3.</span>
                      <span>Agent can trade on your behalf!</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ You remain in control:</strong> Agent can only trade - cannot withdraw funds. You can revoke access anytime.
                  </div>

                  {txHash && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-green-700 dark:text-green-300 text-sm mb-2">Transaction submitted!</p>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs break-all"
                      >
                        View on Arbiscan →
                      </a>
                    </div>
                  )}

                  <button
                    onClick={approveAgent}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        ✍️ Approve Agent (Sign Transaction)
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          ) : (
            /* Approved */
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Agent Approved! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Your agent can now trade on Ostium
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View transaction →
                </a>
              )}

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Agent whitelisted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Ready to execute signals</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

