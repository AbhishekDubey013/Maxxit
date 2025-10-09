import { ethers } from "ethers";

console.log("\n🔐 Creating New Secure Executor Wallet\n");
console.log("━".repeat(60));

// Generate new wallet
const newWallet = ethers.Wallet.createRandom();

console.log("\n✅ New Wallet Generated!\n");
console.log("📍 Address:", newWallet.address);
console.log("🔑 Private Key:", newWallet.privateKey);
console.log("📝 Mnemonic:", newWallet.mnemonic?.phrase);

console.log("\n━".repeat(60));
console.log("\n⚠️  CRITICAL SECURITY INSTRUCTIONS:\n");
console.log("1. 🔴 SAVE the private key in a secure password manager");
console.log("2. 🔴 UPDATE your .env file:");
console.log(`   EXECUTOR_PRIVATE_KEY=${newWallet.privateKey}`);
console.log("3. 🔴 NEVER share this key with anyone");
console.log("4. 🔴 NEVER commit .env to git");
console.log("5. 🔴 DELETE this script output from terminal history");

console.log("\n━".repeat(60));
console.log("\n📋 Old vs New Wallet:\n");
console.log("❌ OLD (COMPROMISED):", "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6");
console.log("✅ NEW (SECURE):", newWallet.address);

console.log("\n━".repeat(60));
console.log("\n🔄 Next Steps:\n");
console.log("1. Update .env with new EXECUTOR_PRIVATE_KEY");
console.log("2. Fund new wallet with ETH for gas");
console.log("3. Update database if executor address stored");
console.log("4. Redeploy module if needed");
console.log("5. Scan your device for malware!");
console.log("\n");


