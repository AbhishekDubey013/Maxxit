import { ethers } from "ethers";
import fetch from "node-fetch";

const WALLET_ADDRESS = "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6";
const INCOMING_TX = "0xd1847cc1e3a055d62294aa1cf7cf96ced6d4cf67db0017e63809992931162d9c";

// Note: Arbiscan API requires API key for full access
// Free tier: 5 requests/second, 100,000 requests/day

async function analyzeTransactions() {
  console.log("\n🚨 DETAILED ARBITRUM WALLET ANALYSIS\n");
  console.log("━".repeat(70));
  
  console.log(`\n📍 Wallet: ${WALLET_ADDRESS}`);
  console.log(`\n📥 Known Incoming: ${INCOMING_TX}`);
  console.log("   Amount: 0.00213582 ETH");
  console.log("   Time: Oct 8, 2025 10:11:52 AM");
  
  console.log("\n━".repeat(70));
  console.log("\n🔍 WHAT YOU NEED TO CHECK ON ARBISCAN:\n");
  
  console.log("1️⃣  ALL TRANSACTIONS (7 total):");
  console.log("   🔗 https://arbiscan.io/address/0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6\n");
  console.log("   Look for any transactions AFTER the incoming one");
  console.log("   Check the 'To' address and 'Value' of each outgoing tx\n");
  
  console.log("2️⃣  INTERNAL TRANSACTIONS:");
  console.log("   🔗 https://arbiscan.io/address/0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6#internaltx\n");
  console.log("   Smart contracts can move funds internally");
  console.log("   These won't show in regular transactions!\n");
  
  console.log("3️⃣  TOKEN APPROVALS:");
  console.log("   🔗 https://revoke.cash/address/0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6?chainId=42161\n");
  console.log("   Malicious approvals can drain tokens");
  console.log("   REVOKE ALL SUSPICIOUS APPROVALS IMMEDIATELY!\n");
  
  console.log("4️⃣  ERC-20 TOKEN TRANSFERS:");
  console.log("   🔗 https://arbiscan.io/address/0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6#tokentxns\n");
  
  console.log("\n━".repeat(70));
  console.log("\n💡 SPECIFIC QUESTIONS TO ANSWER:\n");
  
  console.log("❓ Where did the 0.00213 ETH go?");
  console.log("   - Check transactions list for outgoing ETH");
  console.log("   - Note the recipient address");
  console.log("   - Note the timestamp (when did it leave?)\n");
  
  console.log("❓ Was it a contract interaction?");
  console.log("   - If 'To' address is a contract, check what contract");
  console.log("   - Look at 'Input Data' to see what function was called\n");
  
  console.log("❓ Did you authorize these transactions?");
  console.log("   - Every transaction requires your private key");
  console.log("   - If you didn't sign it, your key is compromised!\n");
  
  console.log("\n━".repeat(70));
  console.log("\n🚨 IMMEDIATE SECURITY STEPS:\n");
  
  console.log("⚠️  IF YOU DIDN'T AUTHORIZE OUTGOING TRANSACTIONS:\n");
  console.log("1. 🔴 STOP using this wallet immediately");
  console.log("2. 🔴 Your EXECUTOR_PRIVATE_KEY is compromised");
  console.log("3. 🔴 Create a NEW wallet with new private key");
  console.log("4. 🔴 Update .env with new EXECUTOR_PRIVATE_KEY");
  console.log("5. 🔴 Move any remaining funds to new wallet");
  console.log("6. 🔴 Redeploy module with new executor address");
  console.log("7. 🔴 Check your device for malware/keyloggers\n");
  
  console.log("⚠️  NEVER SHARE:");
  console.log("   ❌ Your private key");
  console.log("   ❌ Your seed phrase");
  console.log("   ❌ Your .env file");
  console.log("   ❌ Screenshot of your wallet\n");
  
  console.log("\n━".repeat(70));
  console.log("\n📋 ACTION ITEMS:\n");
  
  console.log("[ ] Open Arbiscan and review all 7 transactions");
  console.log("[ ] Identify which transaction(s) moved the 0.00213 ETH");
  console.log("[ ] Check if transaction was to an unknown address");
  console.log("[ ] Check Revoke.cash for suspicious approvals");
  console.log("[ ] Determine if this was authorized by you");
  console.log("[ ] If compromised: Create new wallet & rotate keys");
  console.log("[ ] If compromised: Scan device for malware");
  console.log("[ ] If compromised: Review how key was exposed\n");
  
  console.log("\n━".repeat(70));
  console.log("\n📊 CURRENT STATUS:\n");
  
  console.log("   Received: 0.00213582 ETH");
  console.log("   Current:  0.00000189 ETH");
  console.log("   Missing:  0.00213393 ETH (99.9%)\n");
  console.log("   🚨 FUNDS WERE MOVED OUT - INVESTIGATE NOW!\n");
  
  console.log("━".repeat(70));
  console.log("\n💬 REPLY WITH THE TRANSACTION HASHES you find on Arbiscan");
  console.log("   and I can help you analyze them further.\n");
}

analyzeTransactions().catch(console.error);


