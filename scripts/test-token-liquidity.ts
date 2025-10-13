/**
 * Test which tokens have good liquidity on Uniswap V3
 */

import { ethers } from 'ethers';

const RPC = 'https://arb1.arbitrum.io/rpc';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Uniswap V3 Quoter

// Test tokens
const TOKENS_TO_TEST = [
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
  { symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { symbol: 'PENDLE', address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8' },
  { symbol: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a' },
  { symbol: 'GRT', address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7' },
  { symbol: 'AAVE', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' },
  { symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978' },
  { symbol: 'SNX', address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60' },
  { symbol: 'LDO', address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60' },
  { symbol: 'PEPE', address: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00' },
  { symbol: 'BONK', address: '0x09199d9A5F4448D0848e4395D065e1ad9c4a1F74' },
  { symbol: 'RNDR', address: '0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279' },
  { symbol: 'FET', address: '0x4BE87C766A7CE11D5Cc864b6C3Abb7457dCC4cC9' },
  { symbol: 'AVAX', address: '0x565609fAF65B92F7be02468acF86f8979423e514' },
  { symbol: 'MATIC', address: '0x561877b6b3DD7651313794e5F2894B2F18bE0766' },
  { symbol: 'SOL', address: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07' },
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

async function main() {
  console.log('🔍 Testing token liquidity on Uniswap V3...\n');
  console.log('Testing 1 USDC swaps for each token:\n');
  
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const quoter = new ethers.Contract(QUOTER, QUOTER_ABI, provider);
  
  const testAmount = ethers.utils.parseUnits('1', 6); // 1 USDC
  const poolFees = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  
  const workingTokens: string[] = [];
  const failedTokens: string[] = [];
  
  for (const token of TOKENS_TO_TEST) {
    let success = false;
    let bestQuote = ethers.BigNumber.from(0);
    let bestFee = 0;
    
    for (const fee of poolFees) {
      try {
        const quote = await quoter.callStatic.quoteExactInputSingle(
          USDC,
          token.address,
          fee,
          testAmount,
          0
        );
        
        if (quote.gt(0) && quote.gt(bestQuote)) {
          bestQuote = quote;
          bestFee = fee;
          success = true;
        }
      } catch (error) {
        // Pool doesn't exist for this fee tier
      }
    }
    
    if (success) {
      console.log(`✅ ${token.symbol.padEnd(8)} - Works! (Fee: ${bestFee / 100}%, Quote: ${ethers.utils.formatUnits(bestQuote, 18).substring(0, 10)})`);
      workingTokens.push(token.symbol);
    } else {
      console.log(`❌ ${token.symbol.padEnd(8)} - No liquidity`);
      failedTokens.push(token.symbol);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`\n✅ Working tokens (${workingTokens.length}):`);
  console.log(workingTokens.join(', '));
  
  if (failedTokens.length > 0) {
    console.log(`\n❌ Failed tokens (${failedTokens.length}):`);
    console.log(failedTokens.join(', '));
    console.log('\nThese tokens should be removed from whitelist.\n');
  }
}

main();

