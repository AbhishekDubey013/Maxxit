#!/usr/bin/env tsx
/**
 * Check which Sepolia Uniswap V3 pools have liquidity
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

// Sepolia tokens
const TOKENS = {
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
  LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
};

const FACTORY_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'; // Uniswap V3 Factory on Sepolia

const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
];

const POOL_ABI = [
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
];

const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function symbol() external view returns (string)',
];

async function checkPools() {
  console.log('🔍 Checking Uniswap V3 Pools on Sepolia\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

  const fees = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  const pairs = [
    ['USDC', 'WETH'],
    ['USDC', 'DAI'],
    ['WETH', 'DAI'],
    ['WETH', 'LINK'],
  ];

  for (const [token0Name, token1Name] of pairs) {
    console.log(`\n📊 ${token0Name}/${token1Name}:\n`);
    
    const token0 = TOKENS[token0Name as keyof typeof TOKENS];
    const token1 = TOKENS[token1Name as keyof typeof TOKENS];

    for (const fee of fees) {
      try {
        const poolAddress = await factory.getPool(token0, token1, fee);
        
        if (poolAddress === ethers.constants.AddressZero) {
          console.log(`   ${fee/10000}% fee: ❌ Pool doesn't exist`);
          continue;
        }

        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
        const liquidity = await pool.liquidity();

        if (liquidity.eq(0)) {
          console.log(`   ${fee/10000}% fee: ⚠️  Pool exists but empty`);
        } else {
          console.log(`   ${fee/10000}% fee: ✅ Pool has liquidity!`);
          console.log(`      Address: ${poolAddress}`);
          console.log(`      Liquidity: ${liquidity.toString()}`);
          
          // Check token balances in pool
          const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
          const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
          
          const balance0 = await token0Contract.balanceOf(poolAddress);
          const balance1 = await token1Contract.balanceOf(poolAddress);
          
          console.log(`      ${token0Name} balance: ${ethers.utils.formatUnits(balance0, 6)}`);
          console.log(`      ${token1Name} balance: ${ethers.utils.formatUnits(balance1, 18)}`);
        }
      } catch (error: any) {
        console.log(`   ${fee/10000}% fee: ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Recommendation:\n');
  console.log('If no pools have liquidity on Sepolia, your options are:\n');
  console.log('1. Deploy to Arbitrum mainnet (real liquidity, real money)');
  console.log('2. Add liquidity to a Sepolia pool yourself (for testing)');
  console.log('3. Use a mock swap for testing (no real DEX needed)\n');
}

checkPools().catch(console.error);
