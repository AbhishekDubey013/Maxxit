import { ethers } from "ethers";

const WALLET_ADDRESS = "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6";
const ARBITRUM_RPC = "https://arb1.arbitrum.io/rpc";

async function checkArbitrumWallet() {
  console.log("\n🔍 Checking Arbitrum One Wallet Activity\n");
  console.log("━".repeat(60));
  
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  
  // Get current balance
  const balance = await provider.getBalance(WALLET_ADDRESS);
  console.log(`\n💰 Current Balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // Get recent transaction count
  const txCount = await provider.getTransactionCount(WALLET_ADDRESS);
  console.log(`📊 Total Transactions: ${txCount}`);
  
  console.log("\n━".repeat(60));
  console.log("\n📜 Recent Transaction Analysis:");
  console.log("\n⚠️  To see full transaction history with incoming/outgoing details:");
  console.log(`\n🔗 Visit: https://arbiscan.io/address/${WALLET_ADDRESS}`);
  console.log(`\n🔗 Internal Txns: https://arbiscan.io/address/${WALLET_ADDRESS}#internaltx`);
  console.log(`\n🔗 Token Transfers: https://arbiscan.io/address/${WALLET_ADDRESS}#tokentxns`);
  
  console.log("\n━".repeat(60));
  console.log("\n🔎 Specific Transaction You Mentioned:");
  console.log("\nIncoming: 0xd1847cc1e3a055d62294aa1cf7cf96ced6d4cf67db0017e63809992931162d9c");
  console.log("Amount: 0.00213582 ETH");
  console.log("From: 0x25681Ab599B4E2CEea31F8B498052c53FC2D74db");
  
  try {
    const tx = await provider.getTransaction(
      "0xd1847cc1e3a055d62294aa1cf7cf96ced6d4cf67db0017e63809992931162d9c"
    );
    
    if (tx) {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      const block = await provider.getBlock(tx.blockNumber!);
      
      console.log(`\n✅ Transaction Confirmed`);
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
    }
  } catch (error) {
    console.log("\n⚠️  Could not fetch transaction details from RPC");
  }
  
  console.log("\n━".repeat(60));
  console.log("\n🔍 Checking for Outgoing Transactions...\n");
  
  // Get latest block
  const latestBlock = await provider.getBlockNumber();
  console.log(`Current Block: ${latestBlock}`);
  
  console.log("\n⚠️  IMPORTANT: RPC nodes don't provide full transaction history.");
  console.log("   You MUST check Arbiscan directly for complete history.");
  console.log("\n   Look for:");
  console.log("   1. Any outgoing transactions around the same time");
  console.log("   2. Contract interactions that might have transferred funds");
  console.log("   3. Token approvals to unknown addresses");
  console.log("   4. Internal transactions (contract calls)");
  
  console.log("\n━".repeat(60));
  console.log("\n🚨 SECURITY CHECKLIST:\n");
  console.log("   ✓ Check all outgoing txns: https://arbiscan.io/address/${WALLET_ADDRESS}");
  console.log("   ✓ Check internal txns: https://arbiscan.io/address/${WALLET_ADDRESS}#internaltx");
  console.log("   ✓ Check token approvals: https://revoke.cash/address/${WALLET_ADDRESS}?chainId=42161");
  console.log("   ✓ Verify your private key is secure");
  console.log("   ✓ If compromised, move remaining funds IMMEDIATELY\n");
  
  console.log("━".repeat(60));
}

checkArbitrumWallet().catch(console.error);


