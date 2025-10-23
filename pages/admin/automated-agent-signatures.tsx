import React, { useState, useEffect } from 'react';
import { Bot, Clock, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Header } from '@components/Header';

interface Signal {
  id: string;
  tokenSymbol: string;
  side: string;
  createdAt: string;
  sizeModel: any;
  agent: {
    id: string;
    name: string;
    creatorWallet: string;
  };
}

export default function AutomatedAgentSignaturesPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [agentPrivateKey, setAgentPrivateKey] = useState('');

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/signals-needing-automated-signatures');
      const result = await response.json();
      
      if (result.success) {
        setSignals(result.signals);
      } else {
        console.error('Failed to fetch signals:', result.error);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleAutomatedSigning = async (signal: Signal) => {
    if (!agentPrivateKey) {
      alert('Please enter the agent private key first');
      return;
    }

    setSigning(signal.id);

    try {
      const response = await fetch('/api/admin/automated-agent-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signalId: signal.id,
          agentPrivateKey: agentPrivateKey
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Automated agent signature created successfully');
        // Refresh the signals list
        fetchSignals();
      } else {
        alert(`Failed to create automated signature: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to create automated signature:', error);
      alert(`Failed to create automated signature: ${error.message}`);
    } finally {
      setSigning(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Automated Agent Signatures</h1>
              <p className="mt-2 text-gray-600">
                Manage automated agent signatures for autonomous trading
              </p>
            </div>
            <button
              onClick={fetchSignals}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Agent Private Key Input */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Private Key</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Private Key (for automated signing)
              </label>
              <input
                type="password"
                value={agentPrivateKey}
                onChange={(e) => setAgentPrivateKey(e.target.value)}
                placeholder="Enter agent private key for automated signing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Security Notice</h3>
                  <p className="text-sm text-yellow-800">
                    This private key will be used to automatically sign trading signals. 
                    Ensure this is a dedicated agent wallet with limited funds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Automation</p>
                <p className="text-2xl font-bold text-gray-900">{signals.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Automated Signatures</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ready for Execution</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signals List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Signals Requiring Automated Agent Signatures</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading signals...
              </div>
            </div>
          ) : signals.length === 0 ? (
            <div className="p-8 text-center">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No signals pending automation</h3>
              <p className="text-gray-600">All signals have automated signatures or manual executor agreements.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {signals.map((signal) => (
                <div key={signal.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{signal.agent.name}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{signal.tokenSymbol}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          signal.side === 'BUY' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {signal.side}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Amount: {signal.sizeModel?.value || '1'}</span>
                        <span>•</span>
                        <span>Created: {new Date(signal.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Pending Automation</span>
                      </div>
                      
                      <button
                        onClick={() => handleAutomatedSigning(signal)}
                        disabled={signing === signal.id || !agentPrivateKey}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {signing === signal.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Auto Sign
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
