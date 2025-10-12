import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

const MODULE_ABI = [
  'function setTokenWhitelist(address safe, address token, bool enabled) external',
  'function isTokenWhitelisted(address safe, address token) public view returns (bool)',
];

async function whitelistUSDC() {
  console.log('\n🔧 Whitelisting USDC for Safe\n');

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const owner = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  const moduleContract = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, owner);

  const isUSDCWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, USDC_ADDRESS);
  console.log(`USDC Status: ${isUSDCWhitelisted ? '✅ Whitelisted' : '❌ Not whitelisted'}`);

  if (!isUSDCWhitelisted) {
    console.log(`\n🔄 Whitelisting USDC...`);
    const tx = await moduleContract.setTokenWhitelist(SAFE_ADDRESS, USDC_ADDRESS, true);
    console.log(`TX sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ USDC whitelisted!`);
  }

  console.log('\n✅ Done!\n');
}

whitelistUSDC().catch(console.error);

