#!/usr/bin/env tsx
import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  const address = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
  
  const balance = await provider.getBalance(address);
  const eth = ethers.utils.formatEther(balance);
  
  console.log('Executor wallet:', address);
  console.log('ETH Balance:', eth, 'ETH');
  console.log('');
  
  if (parseFloat(eth) < 0.005) {
    console.log('⚠️  Low ETH! Need at least 0.01 ETH for gas');
    console.log('   Please send ETH to executor wallet on Arbitrum');
  } else {
    console.log('✅ Sufficient ETH for gas');
  }
}

main();

