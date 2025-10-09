import { ethers } from "ethers";

console.log("\n🔍 Wallet Derivation Analysis\n");
console.log("━".repeat(70));

const COMPROMISED_ADDRESS = "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6";
const NEW_ADDRESS = "0xd9F6f864f3F93877a3557EF67f2E50D7066aE189";

console.log("\n❓ CRITICAL QUESTION: How was the wallet created?\n");

console.log("📋 Two Possibilities:\n");

console.log("1️⃣  Created from SEED PHRASE (MetaMask-style):");
console.log("   - You imported a 12/24 word seed phrase");
console.log("   - Multiple accounts derived from same seed");
console.log("   - If seed compromised: ALL accounts at risk!");
console.log("");

console.log("2️⃣  Created from PRIVATE KEY directly:");
console.log("   - You generated/imported just one private key");
console.log("   - No seed phrase involved");
console.log("   - If key compromised: Only THIS account at risk");
console.log("");

console.log("━".repeat(70));
console.log("\n🔍 Checking Your Wallets:\n");

console.log(`❌ Compromised: ${COMPROMISED_ADDRESS}`);
console.log(`✅ New Wallet:  ${NEW_ADDRESS}`);
console.log("");

console.log("━".repeat(70));
console.log("\n⚠️  TO DETERMINE YOUR RISK:\n");

console.log("❓ Answer these questions:\n");

console.log("1. How did you create the compromised wallet?");
console.log("   a) From MetaMask with 12-word seed phrase → ALL ACCOUNTS AT RISK");
console.log("   b) Generated private key directly → Only that account at risk");
console.log("");

console.log("2. Do you have OTHER accounts from the same seed?");
console.log("   - If YES: They're ALL compromised!");
console.log("   - If NO: Only the one account is compromised");
console.log("");

console.log("3. Where is this private key stored?");
console.log("   - In your .env file only → Check how it got there");
console.log("   - Also in MetaMask → Check if other accounts exist");
console.log("");

console.log("━".repeat(70));
console.log("\n🛡️  SECURITY RECOMMENDATIONS:\n");

console.log("✅ If SEED was compromised:");
console.log("   1. 🚨 Create NEW seed phrase (new wallet entirely)");
console.log("   2. 🚨 Move ALL accounts to new seed");
console.log("   3. 🚨 Never use old seed phrase again");
console.log("   4. 🚨 All derived accounts are vulnerable");
console.log("");

console.log("✅ If only PRIVATE KEY was compromised:");
console.log("   1. ✅ New private key generated (already done!)");
console.log("   2. ✅ Other accounts from same seed should be safe");
console.log("   3. ⚠️  But investigate HOW key was leaked");
console.log("   4. ⚠️  Consider rotating all keys as precaution");
console.log("");

console.log("━".repeat(70));
console.log("\n📊 Example: MetaMask with Multiple Accounts\n");

// Show how HD wallet derivation works
console.log("Seed Phrase: 'apple banana cherry...'");
console.log("  ↓");
console.log("Account 1 (m/44'/60'/0'/0/0): 0xabc...123");
console.log("Account 2 (m/44'/60'/0'/0/1): 0xdef...456");
console.log("Account 3 (m/44'/60'/0'/0/2): 0xghi...789");
console.log("");
console.log("If SEED compromised → ALL 3 accounts compromised");
console.log("If only Account 1's private key leaked → Only Account 1 at risk");
console.log("");

console.log("━".repeat(70));
console.log("\n💡 WHAT YOU SHOULD DO:\n");

console.log("[ ] Check if compromised wallet was from MetaMask");
console.log("[ ] Check if you have other accounts in same MetaMask");
console.log("[ ] If yes, check if those accounts also show suspicious activity");
console.log("[ ] If seed compromised, create ENTIRELY NEW seed phrase");
console.log("[ ] If only key leaked, continue with new key (already done)");
console.log("[ ] Find out HOW the key was leaked to prevent it again");
console.log("");

console.log("━".repeat(70));
console.log("\n🔐 Best Practice Going Forward:\n");

console.log("1. 🎯 SEPARATE wallets for separate purposes:");
console.log("   - Personal wallet (hardware wallet recommended)");
console.log("   - Development wallet (hot wallet, minimal funds)");
console.log("   - Production wallet (hardware wallet for signing)");
console.log("");

console.log("2. 🎯 NEVER use the same seed for:");
console.log("   - Personal funds AND development");
console.log("   - Multiple projects");
console.log("   - Production AND testing");
console.log("");

console.log("3. 🎯 For automated systems like Maxxit:");
console.log("   - Generate standalone private keys (no seed)");
console.log("   - Store in secure .env (never committed)");
console.log("   - Rotate regularly");
console.log("   - Keep minimal funds needed");
console.log("");

console.log("━".repeat(70));
console.log("");


