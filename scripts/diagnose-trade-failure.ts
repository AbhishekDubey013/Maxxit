/**
 * Diagnose why trades are failing
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const EXECUTOR_ADDRESS = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function allowance(address owner, address spender) view returns (uint256)', 'function decimals() view returns (uint8)'];

const MODULE_ABI = [
  'function whitelistedTokens(address) view returns (bool)',
  'function whitelistedDexes(address) view returns (bool)',
  'function authorizedExecutors(address) view returns (bool)',
  'function isInitialized(address) view returns (bool)',
  'function initialCapital(address) view returns (uint256)',
];

async function main() {
  console.log('🔍 Diagnosing Trade Failure\n');
  console.log('Safe:', SAFE_ADDRESS);
  console.log('Module:', MODULE_ADDRESS);
  console.log('Executor:', EXECUTOR_ADDRESS);
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);

  // Check 1: Token Whitelisting
  console.log('1️⃣  Token Whitelist Status:');
  const usdcWhitelisted = await module.whitelistedTokens(USDC_ADDRESS);
  const wethWhitelisted = await module.whitelistedTokens(WETH_ADDRESS);
  const arbWhitelisted = await module.whitelistedTokens(ARB_ADDRESS);
  console.log(`   USDC: ${usdcWhitelisted ? '✅' : '❌'}`);
  console.log(`   WETH: ${wethWhitelisted ? '✅' : '❌'}`);
  console.log(`   ARB:  ${arbWhitelisted ? '✅' : '❌'}`);
  console.log('');

  // Check 2: DEX Whitelist
  console.log('2️⃣  DEX Whitelist Status:');
  const dexWhitelisted = await module.whitelistedDexes(UNISWAP_ROUTER);
  console.log(`   Uniswap Router: ${dexWhitelisted ? '✅' : '❌'}`);
  console.log('');

  // Check 3: Executor Authorization
  console.log('3️⃣  Executor Authorization:');
  const executorAuthorized = await module.authorizedExecutors(EXECUTOR_ADDRESS);
  console.log(`   ${EXECUTOR_ADDRESS}: ${executorAuthorized ? '✅' : '❌'}`);
  console.log('');

  // Check 4: Capital Initialization
  console.log('4️⃣  Safe Capital Status:');
  const isInit = await module.isInitialized(SAFE_ADDRESS);
  const initialCap = await module.initialCapital(SAFE_ADDRESS);
  console.log(`   Initialized: ${isInit ? '✅' : '❌'}`);
  console.log(`   Initial Capital: ${ethers.utils.formatUnits(initialCap, 6)} USDC`);
  console.log('');

  // Check 5: Safe USDC Balance
  console.log('5️⃣  Safe Token Balances:');
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);
  const arb = new ethers.Contract(ARB_ADDRESS, ERC20_ABI, provider);

  const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const wethBalance = await weth.balanceOf(SAFE_ADDRESS);
  const arbBalance = await arb.balanceOf(SAFE_ADDRESS);

  console.log(`   USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
  console.log(`   WETH: ${ethers.utils.formatUnits(wethBalance, 18)}`);
  console.log(`   ARB:  ${ethers.utils.formatUnits(arbBalance, 18)}`);
  console.log('');

  // Check 6: USDC Approval to Router
  console.log('6️⃣  Token Approvals (Safe → Uniswap Router):');
  const usdcApproval = await usdc.allowance(SAFE_ADDRESS, UNISWAP_ROUTER);
  console.log(`   USDC Approval: ${ethers.utils.formatUnits(usdcApproval, 6)} USDC`);
  console.log(`   ${usdcApproval.gt(0) ? '✅ Has approval' : '❌ NO APPROVAL - This is likely the issue!'}`);
  console.log('');

  // Check 7: Executor ETH Balance
  console.log('7️⃣  Executor Wallet (Gas):');
  const executorBalance = await provider.getBalance(EXECUTOR_ADDRESS);
  console.log(`   ETH Balance: ${ethers.utils.formatEther(executorBalance)} ETH`);
  console.log(`   ${executorBalance.gt(ethers.utils.parseEther('0.001')) ? '✅ Sufficient' : '⚠️  Low'}`);
  console.log('');

  // Summary
  console.log('📊 DIAGNOSIS SUMMARY:');
  console.log('═══════════════════════════════════════');

  const issues = [];

  if (!usdcWhitelisted || !wethWhitelisted || !arbWhitelisted) {
    issues.push('❌ Tokens not whitelisted in module');
  }
  if (!dexWhitelisted) {
    issues.push('❌ DEX not whitelisted in module');
  }
  if (!executorAuthorized) {
    issues.push('❌ Executor not authorized');
  }
  if (!isInit) {
    issues.push('⚠️  Safe capital not initialized (will auto-initialize on first trade)');
  }
  if (usdcBalance.eq(0)) {
    issues.push('❌ Safe has ZERO USDC balance');
  }
  if (usdcApproval.eq(0)) {
    issues.push('❌ USDC NOT APPROVED to Uniswap Router - THIS IS THE LIKELY ISSUE!');
  }
  if (executorBalance.lt(ethers.utils.parseEther('0.001'))) {
    issues.push('⚠️  Executor wallet low on ETH');
  }

  if (issues.length === 0) {
    console.log('✅ All checks passed! Issue might be elsewhere.');
  } else {
    console.log('Issues found:');
    issues.forEach((issue) => console.log(`  ${issue}`));
  }

  console.log('═══════════════════════════════════════');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

