import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit';

/**
 * Test GMX trading via DIRECT Safe transaction (no module)
 * This mimics gmx-safe-sdk approach
 */

const GMX_EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const GMX_ORDER_VAULT = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

// ETH/USD market on GMX V2
const ETH_MARKET = '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336';

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🧪 Testing GMX Direct Safe Transaction\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('✅ Mode: Direct Safe call (no module)');
  console.log('   Safe:', SAFE_ADDRESS);
  console.log('   GMX Router:', GMX_EXCHANGE_ROUTER);
  console.log('\n════════════════════════════════════════════════════════════\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  console.log('👤 Executor:', signer.address);
  console.log('💰 Executor ETH:', ethers.utils.formatEther(await signer.getBalance()), '\n');

  // Get Safe balances
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const wethContract = new ethers.Contract(
    WETH_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const usdcBalance = await usdcContract.balanceOf(SAFE_ADDRESS);
  const wethBalance = await wethContract.balanceOf(SAFE_ADDRESS);
  const ethBalance = await provider.getBalance(SAFE_ADDRESS);

  console.log('💰 Safe Balances:');
  console.log('   USDC:', ethers.utils.formatUnits(usdcBalance, 6));
  console.log('   WETH:', ethers.utils.formatEther(wethBalance));
  console.log('   ETH:', ethers.utils.formatEther(ethBalance));

  if (usdcBalance.lt(ethers.utils.parseUnits('1', 6))) {
    console.log('\n❌ Insufficient USDC for test (need at least 1 USDC)');
    return;
  }

  if (ethBalance.lt(ethers.utils.parseEther('0.001'))) {
    console.log('\n❌ Insufficient ETH for execution fee (need at least 0.001 ETH)');
    return;
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📤 Creating GMX LONG ETH Position:');
  console.log('   Collateral: 1 USDC');
  console.log('   Leverage: 2x');
  console.log('   Position Size: 2 USD');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get ETH price from Chainlink
  const chainlinkFeed = new ethers.Contract(
    '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612', // ETH/USD Chainlink
    ['function latestAnswer() view returns (int256)'],
    provider
  );
  const ethPrice = (await chainlinkFeed.latestAnswer()).div(1e8);
  console.log('📊 Current ETH Price: $' + ethPrice.toString());

  // Calculate acceptable price (1% slippage for long)
  const acceptablePrice = ethPrice.mul(101).div(100);
  const acceptablePriceWei = acceptablePrice.mul(ethers.BigNumber.from(10).pow(30));

  console.log('   Acceptable Price: $' + acceptablePrice.toString(), '\n');

  // Step 1: Wrap ETH to WETH
  console.log('⏳ Step 1: Wrapping 0.001 ETH to WETH...');
  const executionFee = ethers.utils.parseEther('0.001');

  const wrapData = new ethers.utils.Interface([
    'function deposit() external payable',
  ]).encodeFunctionData('deposit');

  const safeSdk = await Safe.init({
    provider: RPC_URL,
    signer: process.env.EXECUTOR_PRIVATE_KEY!,
    safeAddress: SAFE_ADDRESS,
  });

  const wrapTx = await safeSdk.createTransaction({
    transactions: [{
      to: WETH_ADDRESS,
      value: executionFee.toString(),
      data: wrapData,
    }],
  });

  const wrapResult = await safeSdk.executeTransaction(wrapTx);
  await wrapResult.transactionResponse?.wait();
  console.log('✅ ETH wrapped:', wrapResult.hash, '\n');

  // Step 2: Approve WETH to GMX Router
  console.log('⏳ Step 2: Approving WETH to GMX Router...');
  const approveWethData = new ethers.utils.Interface([
    'function approve(address spender, uint256 amount) external returns (bool)',
  ]).encodeFunctionData('approve', [GMX_EXCHANGE_ROUTER, executionFee]);

  const approveWethTx = await safeSdk.createTransaction({
    transactions: [{
      to: WETH_ADDRESS,
      value: '0',
      data: approveWethData,
    }],
  });

  const approveWethResult = await safeSdk.executeTransaction(approveWethTx);
  await approveWethResult.transactionResponse?.wait();
  console.log('✅ WETH approved:', approveWethResult.hash, '\n');

  // Step 3: Approve USDC to GMX Router
  console.log('⏳ Step 3: Approving USDC to GMX Router...');
  const collateralAmount = ethers.utils.parseUnits('1', 6);
  const approveUsdcData = new ethers.utils.Interface([
    'function approve(address spender, uint256 amount) external returns (bool)',
  ]).encodeFunctionData('approve', [GMX_EXCHANGE_ROUTER, collateralAmount]);

  const approveUsdcTx = await safeSdk.createTransaction({
    transactions: [{
      to: USDC_ADDRESS,
      value: '0',
      data: approveUsdcData,
    }],
  });

  const approveUsdcResult = await safeSdk.executeTransaction(approveUsdcTx);
  await approveUsdcResult.transactionResponse?.wait();
  console.log('✅ USDC approved:', approveUsdcResult.hash, '\n');

  // Step 4: Create GMX order via multicall
  console.log('⏳ Step 4: Creating GMX market order...');

  const sizeDeltaUsd = ethers.utils.parseUnits('2', 30); // 2 USD position size

  // Multicall: sendWnt + sendTokens + createOrder
  const multicallData: string[] = [];

  // 1. sendWnt
  const sendWntData = new ethers.utils.Interface([
    'function sendWnt(address receiver, uint256 amount)',
  ]).encodeFunctionData('sendWnt', [GMX_ORDER_VAULT, executionFee]);
  multicallData.push(sendWntData);

  // 2. sendTokens
  const sendTokensData = new ethers.utils.Interface([
    'function sendTokens(address token, address receiver, uint256 amount)',
  ]).encodeFunctionData('sendTokens', [USDC_ADDRESS, GMX_ORDER_VAULT, collateralAmount]);
  multicallData.push(sendTokensData);

  // 3. createOrder
  const addressesArray = [
    SAFE_ADDRESS, // receiver
    ethers.constants.AddressZero, // callbackContract
    ethers.constants.AddressZero, // uiFeeReceiver
    ETH_MARKET, // market
    USDC_ADDRESS, // initialCollateralToken
    [], // swapPath
  ];

  const numbersArray = [
    sizeDeltaUsd, // sizeDeltaUsd
    collateralAmount, // initialCollateralDeltaAmount
    0, // triggerPrice
    acceptablePriceWei, // acceptablePrice
    executionFee, // executionFee
    0, // callbackGasLimit
    0, // minOutputAmount
  ];

  const createOrderData = new ethers.utils.Interface([
    'function createOrder((address,address,address,address,address,address[]) addresses, (uint256,uint256,uint256,uint256,uint256,uint256,uint256) numbers, uint8 orderType, uint8 decreasePositionSwapType, bool isLong, bool shouldUnwrapNativeToken, bytes32 referralCode)',
  ]).encodeFunctionData('createOrder', [
    addressesArray,
    numbersArray,
    2, // MarketIncrease
    0, // decreasePositionSwapType
    true, // isLong
    false, // shouldUnwrapNativeToken
    ethers.constants.HashZero, // referralCode
  ]);
  multicallData.push(createOrderData);

  // Encode multicall
  const multicallEncoded = new ethers.utils.Interface([
    'function multicall(bytes[] calldata data) external payable returns (bytes[] memory)',
  ]).encodeFunctionData('multicall', [multicallData]);

  const orderTx = await safeSdk.createTransaction({
    transactions: [{
      to: GMX_EXCHANGE_ROUTER,
      value: '0',
      data: multicallEncoded,
    }],
  });

  console.log('   Executing GMX multicall...');
  const orderResult = await safeSdk.executeTransaction(orderTx);
  await orderResult.transactionResponse?.wait();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ GMX Order Created!');
  console.log('   TX:', orderResult.hash);
  console.log('   View on Arbiscan: https://arbiscan.io/tx/' + orderResult.hash);
  console.log('\n   ⏳ GMX keepers will execute the order in ~10-30 seconds');
  console.log('   📊 Check position: https://app.gmx.io/#/trade');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

