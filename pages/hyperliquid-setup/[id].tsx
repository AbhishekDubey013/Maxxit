/**
 * Hyperliquid Setup Page
 * Complete setup flow for Hyperliquid trading
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { HyperliquidAgentApproval } from '../../components/HyperliquidAgentApproval';
import { HyperliquidDashboard } from '../../components/HyperliquidDashboard';
import { ethers } from 'ethers';

export default function HyperliquidSetupPage() {
  const router = useRouter();
  const { id: deploymentId } = router.query;
  
  const [deployment, setDeployment] = useState<any>(null);
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    if (deploymentId) {
      loadDeployment();
    }
  }, [deploymentId]);

  const loadDeployment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agents/${deploymentId}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load agent: ${res.statusText}`);
      }
      
      const agent = await res.json();
      
      if (!agent || !agent.id) {
        throw new Error('Invalid agent data received');
      }
      
      setDeployment(agent);
      
      // Get agent address from private key
      const agentKey = process.env.NEXT_PUBLIC_HYPERLIQUID_TEST_AGENT_KEY || 
                      '0x87111812d0a7bfd1f11adfedcccfdf6ee6a9122a55c6f50bece67c9607a34e17';
      const wallet = new ethers.Wallet(agentKey);
      setAgentAddress(wallet.address);
      
      // Check user's balance (agent.creator_wallet is the user's wallet for Hyperliquid)
      await checkBalance(agent.creator_wallet);
    } catch (err: any) {
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = async (address: string) => {
    try {
      const serviceUrl = process.env.NEXT_PUBLIC_HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';
      const res = await fetch(`${serviceUrl}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      const data = await res.json();
      if (data.success) {
        setBalance(data);
      }
    } catch (err) {
      console.error('Balance check error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deployment...</p>
        </div>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error || 'Deployment not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hyperliquid Setup
          </h1>
          <p className="text-gray-600">
            Complete setup for <span className="font-semibold">{deployment.name}</span>
          </p>
        </div>

        {/* Setup Steps */}
        <div className="space-y-6">
          {/* Step 1: Wallet Setup */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <h2 className="ml-3 text-xl font-semibold text-gray-900">
                Step 1: Wallet Configured
              </h2>
            </div>
            
            <div className="ml-11 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Your Hyperliquid Wallet:</p>
                <code className="block mt-1 bg-gray-50 px-3 py-2 rounded text-sm break-all">
                  {deployment.creator_wallet}
                </code>
              </div>
              
              {balance && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm font-medium text-blue-900">Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${balance.withdrawable?.toFixed(2) || '0.00'} USDC
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Available for trading
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Agent Approval */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <h2 className="ml-3 text-xl font-semibold text-gray-900">
                Step 2: Approve Agent
              </h2>
            </div>
            
            <div className="ml-11">
              <HyperliquidAgentApproval
                deploymentId={deployment.id}
                agentAddress={agentAddress}
                userHyperliquidWallet={deployment.creator_wallet}
                isTestnet={process.env.NEXT_PUBLIC_HYPERLIQUID_TESTNET === 'true'}
                onApprovalComplete={() => {
                  console.log('Approval complete!');
                  setSetupComplete(true);
                  // Reload data
                  loadDeployment();
                }}
              />
            </div>
          </div>

          {/* Step 3: Ready to Trade / Dashboard */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                setupComplete ? 'bg-green-600' : 'bg-gray-400'
              } text-white`}>
                {setupComplete ? '✓' : '3'}
              </div>
              <h2 className="ml-3 text-xl font-semibold text-gray-900">
                Step 3: {setupComplete ? 'Trading Dashboard' : 'Start Trading'}
              </h2>
            </div>
            
            <div className="ml-11">
              {!setupComplete ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Once the agent is approved, it will automatically:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Monitor signals from your subscribed traders</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Execute perpetual positions on Hyperliquid</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Manage positions with trailing stops and take profits</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Keep your funds secure (agent cannot withdraw)</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => setSetupComplete(true)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Dashboard
                  </button>
                </>
              ) : (
                <HyperliquidDashboard
                  deploymentId={deployment.id}
                  agentAddress={agentAddress}
                  userAddress={deployment.creator_wallet}
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/my-deployments')}
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Back to Deployments
          </button>
          <button
            onClick={() => window.open('https://app.hyperliquid-testnet.xyz', '_blank')}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Open Hyperliquid →
          </button>
        </div>
      </div>
    </div>
  );
}

