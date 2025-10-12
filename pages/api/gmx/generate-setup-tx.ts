/**
 * API: Generate GMX Setup Transaction
 * 
 * Returns the batch transaction data for ONE-CLICK setup
 * User can execute this via Safe Transaction Builder or SDK
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { safeAddress } = req.body;

    if (!safeAddress) {
      return res.status(400).json({ error: 'safeAddress required' });
    }

    // Derive executor address
    let executorAddress = '';
    if (EXECUTOR_PRIVATE_KEY) {
      const wallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY);
      executorAddress = wallet.address;
    } else {
      return res.status(500).json({ error: 'Executor not configured' });
    }

    // Transaction 1: Enable Module
    const safeInterface = new ethers.utils.Interface([
      'function enableModule(address module)',
    ]);
    const enableModuleData = safeInterface.encodeFunctionData('enableModule', [MODULE_ADDRESS]);

    // Transaction 2: Authorize GMX Subaccount
    const gmxInterface = new ethers.utils.Interface([
      'function setSubaccount(address subaccount, bool authorized)',
    ]);
    const authorizeGMXData = gmxInterface.encodeFunctionData('setSubaccount', [
      executorAddress,
      true,
    ]);

    // Batch transaction for Safe
    const batchTransaction = {
      version: '1.0',
      chainId: '42161',
      createdAt: Date.now(),
      meta: {
        name: 'Maxxit GMX Setup',
        description: 'ONE-CLICK setup for GMX trading with Maxxit',
        txBuilderVersion: '1.16.1',
      },
      transactions: [
        {
          to: safeAddress,
          value: '0',
          data: enableModuleData,
          contractMethod: {
            inputs: [{ name: 'module', type: 'address' }],
            name: 'enableModule',
            payable: false,
          },
          contractInputsValues: {
            module: MODULE_ADDRESS,
          },
        },
        {
          to: GMX_ROUTER,
          value: '0',
          data: authorizeGMXData,
          contractMethod: {
            inputs: [
              { name: 'subaccount', type: 'address' },
              { name: 'authorized', type: 'bool' },
            ],
            name: 'setSubaccount',
            payable: false,
          },
          contractInputsValues: {
            subaccount: executorAddress,
            authorized: 'true',
          },
        },
      ],
    };

    // Also provide simple transaction array for SDK
    const sdkTransactions = [
      {
        to: safeAddress,
        data: enableModuleData,
        value: '0',
        operation: 0, // CALL
      },
      {
        to: GMX_ROUTER,
        data: authorizeGMXData,
        value: '0',
        operation: 0, // CALL
      },
    ];

    res.status(200).json({
      success: true,
      safeAddress,
      executorAddress,
      moduleAddress: MODULE_ADDRESS,
      gmxRouter: GMX_ROUTER,
      
      // For Safe Transaction Builder (import JSON)
      transactionBuilderJSON: batchTransaction,
      
      // For Safe SDK
      sdkTransactions,
      
      // Manual instructions
      instructions: {
        step1: 'Go to Safe Transaction Builder',
        step2: 'Import this JSON or create batch manually',
        step3: 'Execute transaction',
        transactions: [
          {
            description: 'Enable Maxxit Trading Module',
            to: safeAddress,
            abi: 'enableModule(address)',
            params: { module: MODULE_ADDRESS },
          },
          {
            description: 'Authorize GMX Executor',
            to: GMX_ROUTER,
            abi: 'setSubaccount(address,bool)',
            params: { subaccount: executorAddress, authorized: true },
          },
        ],
      },
      
      // Deep link to Safe Transaction Builder (if available)
      safeAppLink: `https://app.safe.global/apps/open?safe=arb1:${safeAddress}&appUrl=https://apps.gnosis-safe.io/tx-builder`,
    });
  } catch (error: any) {
    console.error('Generate setup tx error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

