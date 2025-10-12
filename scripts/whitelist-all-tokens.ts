import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';

// Top SPOT tokens on Arbitrum
const TOKENS = {
  'WETH': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548',
  'USDC': '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  'LINK': '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  'UNI': '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
  'WBTC': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  'AAVE': '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
  'CRV': '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
  'MKR': '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879',
  'SNX': '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60',
  'BAL': '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
  'COMP': '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
  'YFI': '0x82e3A8F066a6989666b031d916c43672085b1582',
  'SUSHI': '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
  'GRT': '0x9623063377AD1B27544C965cCd7342f7EA7e88C7',
  'LDO': '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',
  'PENDLE': '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
};

const MODULE_ABI = [
  'function setTokenWhitelist(address safe, address token, bool enabled) external',
  'function setTokenWhitelistBatch(address safe, address[] calldata tokens, bool enabled) external',
  'function isTokenWhitelisted(address safe, address token) public view returns (bool)',
];

async function whitelistAllTokens() {
  console.log('\n🔧 Whitelisting All SPOT Tokens for Safe\n');
  console.log('═'.repeat(60));

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const owner = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);
  
  console.log(`\n👤 Module Owner: ${owner.address}`);
  console.log(`🏦 Safe Address: ${SAFE_ADDRESS}`);
  console.log(`🔧 Module Address: ${MODULE_ADDRESS}`);

  const moduleContract = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, owner);

  // Get all token addresses
  const tokenAddresses = Object.values(TOKENS);
  const tokenSymbols = Object.keys(TOKENS);

  console.log(`\n📊 Tokens to whitelist: ${tokenSymbols.length}`);
  console.log(tokenSymbols.join(', '));

  // Use batch whitelist for efficiency
  console.log(`\n🔄 Whitelisting tokens in batch...`);
  
  try {
    const tx = await moduleContract.setTokenWhitelistBatch(
      SAFE_ADDRESS,
      tokenAddresses,
      true,
      {
        gasLimit: 2000000, // High limit for batch operation
      }
    );
    
    console.log(`   TX sent: ${tx.hash}`);
    await tx.wait();
    console.log(`   ✅ Batch whitelist complete!`);
  } catch (error: any) {
    console.error(`   ❌ Batch failed:`, error.message);
    console.log(`\n🔄 Falling back to individual whitelisting...`);
    
    // Fallback: Whitelist individually
    for (let i = 0; i < tokenAddresses.length; i++) {
      const symbol = tokenSymbols[i];
      const address = tokenAddresses[i];
      
      try {
        const isWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, address);
        
        if (isWhitelisted) {
          console.log(`   ${symbol}: ✅ Already whitelisted`);
          continue;
        }
        
        const tx = await moduleContract.setTokenWhitelist(SAFE_ADDRESS, address, true);
        console.log(`   ${symbol}: TX ${tx.hash}`);
        await tx.wait();
        console.log(`   ${symbol}: ✅ Whitelisted`);
        
        // Small delay to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`   ${symbol}: ❌ Failed - ${error.message}`);
      }
    }
  }

  // Verify all
  console.log(`\n✅ Final Status:`);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const symbol = tokenSymbols[i];
    const address = tokenAddresses[i];
    const isWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, address);
    console.log(`   ${symbol}: ${isWhitelisted ? '✅' : '❌'}`);
  }

  console.log('\n═'.repeat(60));
  console.log('\n✅ Done! SPOT tokens ready for trading.\n');
}

whitelistAllTokens().catch(console.error);
