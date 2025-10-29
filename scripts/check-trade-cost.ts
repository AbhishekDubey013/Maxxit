import { ethers } from 'ethers';

const TX_HASH = '0x890fbe81a8285315c4fc1af881aa98352e8434bcab9d7d5c1e5eff73091faf8f';
const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';

async function checkTradeCost() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    console.log('📊 Analyzing Trade Transaction\n');
    console.log('━'.repeat(60));
    
    // Get transaction
    const tx = await provider.getTransaction(TX_HASH);
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    console.log('\n💸 Gas Costs:');
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas Price: ${ethers.utils.formatUnits(tx.gasPrice!, 'gwei')} gwei`);
    
    const gasCostWei = receipt.gasUsed.mul(tx.gasPrice!);
    const gasCostEth = ethers.utils.formatEther(gasCostWei);
    console.log(`   Gas Cost: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 2400).toFixed(4)})`);
    
    // Check USDC balance before and after
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const USDC_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ];
    
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    // Parse logs for USDC transfers
    const usdcInterface = new ethers.utils.Interface(USDC_ABI);
    const usdcTransfers = receipt.logs
      .filter(log => log.address.toLowerCase() === USDC_ADDRESS.toLowerCase())
      .map(log => {
        try {
          return usdcInterface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    
    console.log('\n💵 USDC Transfers:');
    usdcTransfers.forEach((transfer: any) => {
      const amount = ethers.utils.formatUnits(transfer.args.value, 6);
      console.log(`   From: ${transfer.args.from}`);
      console.log(`   To: ${transfer.args.to}`);
      console.log(`   Amount: ${amount} USDC`);
      console.log('   ---');
    });
    
    // Check current Safe balance
    const currentBalance = await usdc.balanceOf(SAFE_ADDRESS);
    console.log(`\n💰 Current Safe Balance: ${ethers.utils.formatUnits(currentBalance, 6)} USDC`);
    
    console.log('\n━'.repeat(60));
    console.log('\n📝 Summary:');
    console.log(`   Transaction: https://arbiscan.io/tx/${TX_HASH}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()} (out of ${tx.gasLimit?.toString() || 'N/A'} limit)`);
    console.log(`   Efficiency: ${((receipt.gasUsed.toNumber() / (tx.gasLimit?.toNumber() || 1)) * 100).toFixed(1)}%`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkTradeCost();

