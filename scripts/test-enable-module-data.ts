#!/usr/bin/env tsx

import { ethers } from 'ethers';

const SAFE_ABI = [
  'function enableModule(address module) external',
];

const moduleAddress = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const safeAddress = '0xC613Df8883852667066a8a08c65c18eDe285678D';

const iface = new ethers.utils.Interface(SAFE_ABI);
const txData = iface.encodeFunctionData('enableModule', [moduleAddress]);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 Correct Enable Module Transaction:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Module to Enable:', moduleAddress);
console.log('Safe Address:', safeAddress);
console.log('');
console.log('Transaction Fields:');
console.log('  to:', safeAddress);
console.log('  value:', '0');
console.log('  data:', txData);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Copy this data field to Safe Transaction Builder:');
console.log(txData);
console.log('');

