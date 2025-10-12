/**
 * ONE-CLICK GMX Setup Page
 * 
 * User Experience:
 * 1. Connect wallet
 * 2. Click "Setup GMX Trading"
 * 3. Sign ONE transaction
 * 4. Done! ✅
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types';

const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const EXECUTOR_ADDRESS = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';

export default function GMXSetup() {
  const [safeAddress, setSafeAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  const checkSetupStatus = async () => {
    if (!safeAddress) return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Check module enabled
      const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
      const safe = new ethers.Contract(safeAddress, safeAbi, provider);
      const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);

      // Check GMX authorized
      const gmxAbi = ['function isSubaccount(address account, address subaccount) view returns (bool)'];
      const gmxRouter = new ethers.Contract(GMX_ROUTER, gmxAbi, provider);
      const isGMXAuthorized = await gmxRouter.isSubaccount(safeAddress, EXECUTOR_ADDRESS);

      if (isModuleEnabled && isGMXAuthorized) {
        setSetupComplete(true);
        setStatus('✅ Setup complete! You can start GMX trading!');
      } else {
        setStatus(`Module: ${isModuleEnabled ? '✅' : '❌'} | GMX Auth: ${isGMXAuthorized ? '✅' : '❌'}`);
      }
    } catch (error: any) {
      console.error('Check status error:', error);
    }
  };

  useEffect(() => {
    if (safeAddress) {
      checkSetupStatus();
    }
  }, [safeAddress]);

  const setupGMXTrading = async () => {
    if (!safeAddress) {
      alert('Please enter your Safe address');
      return;
    }

    setLoading(true);
    setStatus('Preparing transaction...');

    try {
      // Connect wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Initialize Safe SDK
      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      });

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress,
      });

      setStatus('Creating batch transaction...');

      // Transaction 1: Enable Module
      const enableModuleData = safeSdk.getContractManager()
        .safeContract.encode('enableModule', [MODULE_ADDRESS]);

      // Transaction 2: Authorize GMX Subaccount
      const gmxInterface = new ethers.utils.Interface([
        'function setSubaccount(address subaccount, bool authorized)',
      ]);
      const authorizeGMXData = gmxInterface.encodeFunctionData('setSubaccount', [
        EXECUTOR_ADDRESS,
        true,
      ]);

      // Batch transactions
      const transactions: MetaTransactionData[] = [
        {
          to: safeAddress,
          data: enableModuleData,
          value: '0',
        },
        {
          to: GMX_ROUTER,
          data: authorizeGMXData,
          value: '0',
        },
      ];

      setStatus('Creating Safe transaction...');

      const safeTransaction = await safeSdk.createTransaction({
        safeTransactionData: transactions,
      });

      setStatus('Please sign the transaction...');

      const txHash = await safeSdk.getTransactionHash(safeTransaction);
      const signature = await safeSdk.signTransactionHash(txHash);

      setStatus('Executing transaction...');

      const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
      const receipt = await executeTxResponse.transactionResponse?.wait();

      setStatus('✅ Setup complete! Checking status...');
      
      // Wait a bit for blockchain confirmation
      setTimeout(checkSetupStatus, 3000);

      alert(`Success! Transaction: ${receipt?.transactionHash}`);
    } catch (error: any) {
      console.error('Setup error:', error);
      setStatus(`❌ Error: ${error.message}`);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🚀 ONE-CLICK GMX Setup</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>What This Does:</h3>
        <ul>
          <li>✅ Enables Maxxit Trading Module on your Safe</li>
          <li>✅ Authorizes executor for GMX trading</li>
          <li>✅ First trade will auto-initialize USDC approvals</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>Your Safe Address:</strong>
          <br />
          <input
            type="text"
            value={safeAddress}
            onChange={(e) => setSafeAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              marginTop: '10px',
            }}
          />
        </label>
      </div>

      {status && (
        <div
          style={{
            padding: '15px',
            backgroundColor: setupComplete ? '#d4edda' : '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '5px',
            marginBottom: '20px',
          }}
        >
          <strong>Status:</strong> {status}
        </div>
      )}

      <button
        onClick={setupGMXTrading}
        disabled={loading || setupComplete || !safeAddress}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: loading || setupComplete ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading || setupComplete ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Setting up...' : setupComplete ? '✅ Setup Complete' : '🚀 Setup GMX Trading (ONE-CLICK)'}
      </button>

      {!setupComplete && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
          <h4>📋 Requirements:</h4>
          <ul>
            <li>You must be a Safe owner/signer</li>
            <li>You must have enough ETH for gas (~$0.10)</li>
            <li>Your Safe must be on Arbitrum One</li>
          </ul>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h4>🔒 Security Notes:</h4>
        <ul>
          <li>✅ Non-custodial: You retain full control of your Safe</li>
          <li>✅ Module can only execute trades, not transfer funds arbitrarily</li>
          <li>✅ You can disable the module anytime via Safe settings</li>
          <li>✅ GMX positions are owned by your Safe, not the executor</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h4>📚 What Happens Next:</h4>
        <ol>
          <li>Module is enabled on your Safe</li>
          <li>GMX executor is authorized</li>
          <li>First trade auto-initializes:
            <ul>
              <li>USDC approval to module (0.2 USDC fee per trade)</li>
              <li>USDC approval to Uniswap (for swaps)</li>
              <li>Capital tracking initialization</li>
            </ul>
          </li>
          <li>Start trading! 🎉</li>
        </ol>
      </div>
    </div>
  );
}

