/**
 * Safe Deployment Test on Arbitrum MAINNET
 * REAL deployment with REAL ETH!
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Safe contracts on Arbitrum MAINNET
const SAFE_PROXY_FACTORY = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON = '0x41675C099F32341bf84BFc5382aF534df5C7461a';

// V3 Module on Arbitrum Mainnet
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';

const RPC_URL = 'https://arb1.arbitrum.io/rpc';

// Safe ABIs
const FACTORY_ABI = [
  'function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)',
  'event ProxyCreation(address indexed proxy, address singleton)',
];

const SAFE_ABI = [
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external',
  'function enableModule(address module) external',
  'function isModuleEnabled(address module) view returns (bool)',
  'function getOwners() view returns (address[])',
];

async function testMainnetDeployment() {
  console.log('🔴 ARBITRUM MAINNET DEPLOYMENT TEST');
  console.log('⚠️  THIS USES REAL ETH!');
  console.log('='.repeat(60));
  console.log('');

  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ No EXECUTOR_PRIVATE_KEY');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const owner = wallet.address;

  console.log('📊 Wallet Info:');
  console.log('- Address:', owner);
  
  const balance = await provider.getBalance(owner);
  console.log('- Balance:', ethers.utils.formatEther(balance), 'ETH');
  console.log('- Network: Arbitrum One (Mainnet)');
  console.log('');

  if (balance.lt(ethers.utils.parseEther('0.0001'))) {
    console.log('⚠️  Very low balance! May not be enough for gas.');
    console.log('Estimated cost: ~0.0001 ETH');
    console.log('');
  }

  console.log('⚠️  CONFIRMATION REQUIRED');
  console.log('This will deploy a REAL Safe on Arbitrum mainnet.');
  console.log('Cost: ~0.0001-0.0002 ETH in gas fees');
  console.log('');
  console.log('Press Ctrl+C within 5 seconds to cancel...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');
  console.log('🚀 Starting deployment...');
  console.log('');

  try {
    // STEP 1: Deploy Safe
    console.log('STEP 1/2: Deploying Safe...');
    
    const factory = new ethers.Contract(SAFE_PROXY_FACTORY, FACTORY_ABI, wallet);
    const safeSingleton = new ethers.Contract(SAFE_SINGLETON, SAFE_ABI, provider);
    
    // Setup data (no module enabled during setup)
    const setupData = safeSingleton.interface.encodeFunctionData('setup', [
      [owner],
      1,
      ethers.constants.AddressZero,
      '0x',
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      0,
      ethers.constants.AddressZero,
    ]);

    const saltNonce = Date.now();
    console.log('- Sending transaction...');
    
    // Get current gas price and estimate gas
    const gasPrice = await provider.getGasPrice();
    console.log('- Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
    
    // Estimate actual gas needed (usually ~200k-300k)
    const estimatedGas = await factory.estimateGas.createProxyWithNonce(
      SAFE_SINGLETON,
      setupData,
      saltNonce
    );
    console.log('- Estimated gas:', estimatedGas.toString());
    
    // Add 20% buffer
    const gasLimit = estimatedGas.mul(120).div(100);
    console.log('- Gas limit (with buffer):', gasLimit.toString());
    
    const deployTx = await factory.createProxyWithNonce(
      SAFE_SINGLETON,
      setupData,
      saltNonce,
      { 
        gasLimit: gasLimit,
        gasPrice: gasPrice // Use current gas price
      }
    );
    
    console.log('- TX Hash:', deployTx.hash);
    console.log('- Waiting for confirmation...');
    
    const receipt = await deployTx.wait();
    console.log('✅ Safe deployed!');
    console.log('- Gas used:', receipt.gasUsed.toString());
    
    // Get Safe address from event
    const proxyEvent = receipt.events?.find((e: any) => e.event === 'ProxyCreation');
    if (!proxyEvent) {
      throw new Error('Could not find ProxyCreation event');
    }
    
    const safeAddress = proxyEvent.args.proxy;
    console.log('- Safe Address:', safeAddress);
    console.log('- View: https://arbiscan.io/address/' + safeAddress);
    console.log('');

    // Wait for blockchain to settle
    console.log('⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');

    // STEP 2: Enable Module (via execTransaction)
    console.log('STEP 2/2: Enabling trading module...');
    console.log('- Module:', MODULE_ADDRESS);
    
    const safe = new ethers.Contract(safeAddress, SAFE_ABI, wallet);
    
    // Encode enableModule call
    const safeInterface = new ethers.utils.Interface(SAFE_ABI);
    const enableModuleData = safeInterface.encodeFunctionData('enableModule', [MODULE_ADDRESS]);
    
    // Get Safe nonce (call the view function)
    const nonceInterface = new ethers.utils.Interface(['function nonce() view returns (uint256)']);
    const nonceData = nonceInterface.encodeFunctionData('nonce', []);
    const nonceResult = await provider.call({ to: safeAddress, data: nonceData });
    const nonce = ethers.BigNumber.from(nonceResult);
    console.log('- Safe nonce:', nonce.toString());
    
    // For threshold=1 Safe, we can create a simple signature
    // Get transaction hash using provider.call
    const txHashInterface = new ethers.utils.Interface([
      'function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)'
    ]);
    const txHashData = txHashInterface.encodeFunctionData('getTransactionHash', [
      safeAddress,
      0,
      enableModuleData,
      0,  // CALL operation
      0,
      0,
      0,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      nonce
    ]);
    const txHashResult = await provider.call({ to: safeAddress, data: txHashData });
    const txHash = ethers.utils.defaultAbiCoder.decode(['bytes32'], txHashResult)[0];
    
    console.log('- Transaction hash:', txHash);
    
    // Sign the transaction hash
    const signature = await wallet.signMessage(ethers.utils.arrayify(txHash));
    console.log('- Signature created');
    
    // Execute transaction via Safe
    console.log('- Sending transaction...');
    const execInterface = new ethers.utils.Interface([
      'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) payable returns (bool success)'
    ]);
    const execData = execInterface.encodeFunctionData('execTransaction', [
      safeAddress,
      0,
      enableModuleData,
      0,
      0,
      0,
      0,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      signature
    ]);
    
    const enableTx = await wallet.sendTransaction({
      to: safeAddress,
      data: execData,
      gasLimit: 500000
    });
    
    console.log('- TX Hash:', enableTx.hash);
    console.log('- Waiting for confirmation...');
    
    const enableReceipt = await enableTx.wait();
    console.log('✅ Module enabled!');
    console.log('- Gas used:', enableReceipt.gasUsed.toString());
    console.log('');

    // STEP 3: Verify
    console.log('STEP 3: Verification...');
    const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    console.log('- Module enabled:', isEnabled ? '✅ YES' : '❌ NO');
    
    const owners = await safe.getOwners();
    console.log('- Owners:', owners);
    console.log('');

    if (isEnabled) {
      console.log('🎉 SUCCESS! 🎉');
      console.log('');
      console.log('═'.repeat(60));
      console.log('  DEPLOYMENT SUCCESSFUL');
      console.log('═'.repeat(60));
      console.log('');
      console.log('Safe Address:');
      console.log(safeAddress);
      console.log('');
      console.log('Module Enabled: ✅');
      console.log('Owner:', owner);
      console.log('');
      console.log('View on Arbiscan:');
      console.log(`https://arbiscan.io/address/${safeAddress}`);
      console.log('');
      console.log('🎯 PROOF:');
      console.log('✅ Safe deployed on Arbitrum mainnet');
      console.log('✅ Module enabled WITHOUT Safe UI');
      console.log('✅ Two transactions (automated)');
      console.log('✅ Total time: ~1 minute');
      console.log('✅ User would only need to sign twice');
      console.log('');
      console.log('This is the EXACT flow users will experience!');
    } else {
      console.log('❌ Module not enabled - something went wrong');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

console.log('');
testMainnetDeployment()
  .then(() => {
    console.log('');
    console.log('='.repeat(60));
    console.log('Test completed successfully!');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

