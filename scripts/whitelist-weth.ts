import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const WETH_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

const MODULE_ABI = [
  'function setTokenWhitelist(address safe, address token, bool enabled) external',
  'function isTokenWhitelisted(address safe, address token) public view returns (bool)',
];

async function whitelistTokens() {
  console.log('\n🔧 Whitelisting Tokens for Safe\n');
  console.log('═'.repeat(60));

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const owner = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);
  
  console.log(`\n👤 Module Owner: ${owner.address}`);
  console.log(`🏦 Safe Address: ${SAFE_ADDRESS}`);
  console.log(`🔧 Module Address: ${MODULE_ADDRESS}`);

  const moduleContract = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, owner);

  // Check current status
  const isWETHWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, WETH_ADDRESS);
  const isUSDCWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, USDC_ADDRESS);

  console.log(`\n📊 Current Status:`);
  console.log(`   WETH: ${isWETHWhitelisted ? '✅ Whitelisted' : '❌ Not whitelisted'}`);
  console.log(`   USDC: ${isUSDCWhitelisted ? '✅ Whitelisted' : '❌ Not whitelisted'}`);

  // Whitelist WETH
  if (!isWETHWhitelisted) {
    console.log(`\n🔄 Whitelisting WETH...`);
    const tx1 = await moduleContract.setTokenWhitelist(SAFE_ADDRESS, WETH_ADDRESS, true);
    console.log(`   TX sent: ${tx1.hash}`);
    await tx1.wait();
    console.log(`   ✅ WETH whitelisted!`);
  }

  // Whitelist USDC (for closing positions)
  if (!isUSDCWhitelisted) {
    console.log(`\n🔄 Whitelisting USDC...`);
    const tx2 = await moduleContract.setTokenWhitelist(SAFE_ADDRESS, USDC_ADDRESS, true);
    console.log(`   TX sent: ${tx2.hash}`);
    await tx2.wait();
    console.log(`   ✅ USDC whitelisted!`);
  }

  // Verify
  const isWETHWhitelistedAfter = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, WETH_ADDRESS);
  const isUSDCWhitelistedAfter = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, USDC_ADDRESS);

  console.log(`\n✅ Final Status:`);
  console.log(`   WETH: ${isWETHWhitelistedAfter ? '✅ Whitelisted' : '❌ Not whitelisted'}`);
  console.log(`   USDC: ${isUSDCWhitelistedAfter ? '✅ Whitelisted' : '❌ Not whitelisted'}`);

  console.log('\n═'.repeat(60));
  console.log('\n✅ Done! You can now trade WETH on SPOT.\n');
}

whitelistTokens().catch(console.error);

