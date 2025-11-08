/**
 * Ostium Connection Flow
 * 1. Connect Arbitrum wallet
 * 2. Generate agent wallet
 * 3. Get testnet USDC (optional)
 * 4. Approve agent
 * 5. Create deployment
 */

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X, Wallet, Key, Coins, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import { ethers } from 'ethers';

interface OstiumConnectProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'connect' | 'agent' | 'faucet' | 'approve' | 'complete';

export function OstiumConnect({
  agentId,
  agentName,
  onClose,
  onSuccess,
}: OstiumConnectProps) {
  const { user, authenticated, login } = usePrivy();
  const [step, setStep] = useState<Step>('connect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [userWallet, setUserWallet] = useState<string>('');
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [balance, setBalance] = useState<{ usdc: string; eth: string }>({ usdc: '0', eth: '0' });
  const [copied, setCopied] = useState(false);

  // Step 1: Connect Wallet
  const connectWallet = async () => {
    setLoading(true);
    setError('');

    try {
      if (!authenticated || !user?.wallet?.address) {
        await login();
        return;
      }

      const address = user.wallet.address;
      setUserWallet(address);

      // Check balance
      const balanceResponse = await fetch('/api/ostium/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance({
          usdc: balanceData.usdcBalance || '0',
          eth: balanceData.ethBalance || '0',
        });
      }

      setStep('agent');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate Agent Wallet
  const generateAgent = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ostium/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || user?.wallet?.address,
          agentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate agent wallet');
      }

      const data = await response.json();
      setAgentAddress(data.agentAddress);
      setStep('faucet');
    } catch (err: any) {
      setError(err.message || 'Failed to generate agent wallet');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Request Faucet (Optional)
  const requestFaucet = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ostium/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userWallet }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Faucet request failed');
      }

      // Update balance
      const balanceResponse = await fetch('/api/ostium/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userWallet }),
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance({
          usdc: balanceData.usdcBalance || '0',
          eth: balanceData.ethBalance || '0',
        });
      }

      setStep('approve');
    } catch (err: any) {
      setError(err.message || 'Faucet request failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Approve Agent
  const approveAgent = async () => {
    setLoading(true);
    setError('');

    try {
      // Create deployment
      const deploymentResponse = await fetch('/api/ostium/create-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          userWallet,
          agentAddress,
        }),
      });

      if (!deploymentResponse.ok) {
        const errorData = await deploymentResponse.json();
        throw new Error(errorData.error || 'Failed to create deployment');
      }

      setStep('complete');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to approve agent');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Setup Ostium Trading</h2>
            <p className="text-sm text-muted-foreground">Agent: {agentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {[
            { id: 'connect', label: 'Connect', icon: Wallet },
            { id: 'agent', label: 'Agent', icon: Key },
            { id: 'faucet', label: 'Fund', icon: Coins },
            { id: 'approve', label: 'Approve', icon: CheckCircle },
          ].map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isComplete = ['connect', 'agent', 'faucet'].indexOf(step) > ['connect', 'agent', 'faucet'].indexOf(s.id);
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center ${index > 0 ? 'ml-2' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isComplete
                        ? 'bg-green-600 border-green-600 text-white'
                        : isActive
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
                </div>
                {index < 3 && (
                  <div className="h-0.5 w-8 bg-border mx-2 mt-[-20px]"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Connect Wallet */}
          {step === 'connect' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Wallet className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Arbitrum wallet to get started with Ostium trading
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Non-custodial - you keep control</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Trade on Arbitrum (low gas fees)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Agent trades on your behalf</span>
                </div>
              </div>

              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Generate Agent */}
          {step === 'agent' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Key className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Generate Agent Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  We'll create a dedicated agent wallet to trade on your behalf
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Wallet:</span>
                  <span className="font-mono">{userWallet.slice(0, 10)}...{userWallet.slice(-8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">USDC Balance:</span>
                  <span className="font-semibold">${parseFloat(balance.usdc).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ETH Balance:</span>
                  <span className="font-semibold">{parseFloat(balance.eth).toFixed(4)} ETH</span>
                </div>
              </div>

              <button
                onClick={generateAgent}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Generate Agent Wallet
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Get Testnet USDC */}
          {step === 'faucet' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Coins className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Get Testnet USDC</h3>
                <p className="text-sm text-muted-foreground">
                  Request testnet USDC to start trading (Arbitrum Sepolia)
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Agent Wallet:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{agentAddress.slice(0, 10)}...{agentAddress.slice(-8)}</span>
                    <button
                      onClick={() => copyAddress(agentAddress)}
                      className="p-1 hover:bg-background rounded"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">${parseFloat(balance.usdc).toFixed(2)} USDC</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={requestFaucet}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      Request Faucet
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep('approve')}
                  className="flex-1 px-4 py-3 border border-border rounded-md font-medium hover:bg-muted"
                >
                  Skip
                </button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Already have USDC? Click "Skip" to continue
              </div>
            </div>
          )}

          {/* Step 4: Approve Agent */}
          {step === 'approve' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Ready to Trade!</h3>
                <p className="text-sm text-muted-foreground">
                  Complete setup to start automated trading
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Agent wallet created</div>
                    <div className="text-xs text-muted-foreground font-mono">{agentAddress.slice(0, 20)}...</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Your wallet connected</div>
                    <div className="text-xs text-muted-foreground font-mono">{userWallet.slice(0, 20)}...</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Balance: ${parseFloat(balance.usdc).toFixed(2)} USDC</div>
                    <div className="text-xs text-muted-foreground">Ready for trading</div>
                  </div>
                </div>
              </div>

              <button
                onClick={approveAgent}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating deployment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Setup Complete! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Your Ostium agent is ready to start trading
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Agent wallet configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Deployment created</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Ready to execute signals</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

