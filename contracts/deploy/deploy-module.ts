import { ethers } from "hardhat";

/**
 * Deploy MaxxitTradingModule to Arbitrum
 * 
 * Required env vars:
 * - DEPLOYER_PRIVATE_KEY: Private key for deployment
 * - PLATFORM_FEE_RECEIVER: Address to receive trade fees (0.2 USDC per trade)
 * - PLATFORM_PROFIT_RECEIVER: Address to receive profit share (20%)
 * - MODULE_OWNER: Address that can manage whitelists
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying MaxxitTradingModule with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Configuration
  const PLATFORM_FEE_RECEIVER = process.env.PLATFORM_FEE_RECEIVER || deployer.address;
  const PLATFORM_PROFIT_RECEIVER = process.env.PLATFORM_PROFIT_RECEIVER || deployer.address;
  const MODULE_OWNER = process.env.MODULE_OWNER || deployer.address;
  
  // USDC addresses
  const USDC_ADDRESSES: { [chainId: number]: string } = {
    11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Ethereum Sepolia
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum mainnet
    421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arbitrum Sepolia
  };
  
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const USDC = USDC_ADDRESSES[Number(chainId)];
  
  if (!USDC) {
    throw new Error(`USDC address not configured for chain ID ${chainId}`);
  }
  
  console.log("\nDeployment Configuration:");
  console.log("========================");
  console.log("Platform Fee Receiver:", PLATFORM_FEE_RECEIVER);
  console.log("Platform Profit Receiver:", PLATFORM_PROFIT_RECEIVER);
  console.log("Module Owner:", MODULE_OWNER);
  console.log("USDC Address:", USDC);
  console.log("Chain ID:", chainId);
  
  // Deploy
  console.log("\nDeploying MaxxitTradingModule...");
  
  const MaxxitTradingModule = await ethers.getContractFactory("MaxxitTradingModule");
  const module = await MaxxitTradingModule.deploy(
    PLATFORM_FEE_RECEIVER,
    PLATFORM_PROFIT_RECEIVER,
    USDC,
    MODULE_OWNER
  );
  
  await module.deployed();
  
  console.log("\n✅ MaxxitTradingModule deployed to:", module.address);
  
  // Save deployment info
  const deploymentInfo = {
    address: module.address,
    chainId: Number(chainId),
    deployer: deployer.address,
    platformFeeReceiver: PLATFORM_FEE_RECEIVER,
    platformProfitReceiver: PLATFORM_PROFIT_RECEIVER,
    moduleOwner: MODULE_OWNER,
    usdc: USDC,
    tradeFee: "0.2 USDC",
    profitShare: "20%",
    deployedAt: new Date().toISOString(),
  };
  
  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Wait for verification
  console.log("\nWaiting for block confirmations...");
  await module.deployTransaction.wait(5);
  
  console.log("\n✅ Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Verify contract on Arbiscan:");
  console.log(`   npx hardhat verify --network ${chainId === 42161 ? 'arbitrum' : 'arbitrumSepolia'} ${module.address} ${PLATFORM_FEE_RECEIVER} ${PLATFORM_PROFIT_RECEIVER} ${USDC} ${MODULE_OWNER}`);
  console.log("\n2. Authorize executor wallet:");
  console.log(`   module.setExecutorAuthorization(EXECUTOR_ADDRESS, true)`);
  console.log("\n3. Whitelist additional tokens if needed:");
  console.log(`   module.setTokenWhitelist(TOKEN_ADDRESS, true)`);
  console.log("\n4. Update .env with module address:");
  console.log(`   TRADING_MODULE_ADDRESS=${module.address}`);
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
