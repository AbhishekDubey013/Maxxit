import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const POSITION_ID = '63e0a5ed-4936-4e8b-81d7-c7d862d28d50';
const TX_HASH = '0x890fbe81a8285315c4fc1af881aa98352e8434bcab9d7d5c1e5eff73091faf8f';

async function fixPosition() {
  try {
    console.log('🔧 Fixing ARB Position Data\n');

    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const receipt = await provider.getTransactionReceipt(TX_HASH);

    // Parse USDC and ARB transfer amounts from logs
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const ARB_ADDRESS = '0x912CE59144191C1204E64559fE8253a0e49E6548';

    const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');

    let usdcOut = 0;
    let arbIn = 0;

    for (const log of receipt.logs) {
      if (log.topics[0] === transferTopic) {
        const amount = ethers.BigNumber.from(log.data);
        
        if (log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
          usdcOut = parseFloat(ethers.utils.formatUnits(amount, 6));
        } else if (log.address.toLowerCase() === ARB_ADDRESS.toLowerCase()) {
          arbIn = parseFloat(ethers.utils.formatUnits(amount, 18));
        }
      }
    }

    console.log('📊 Transaction Analysis:');
    console.log(`   USDC Out: ${usdcOut.toFixed(6)}`);
    console.log(`   ARB In: ${arbIn.toFixed(6)}`);

    const entryPrice = usdcOut / arbIn;
    console.log(`   Entry Price: $${entryPrice.toFixed(4)}\n`);

    // Update position
    await prisma.position.update({
      where: { id: POSITION_ID },
      data: {
        entryPrice: entryPrice.toString(),
        qty: arbIn.toString(),
      },
    });

    console.log('✅ Position updated!');
    console.log(`   Entry Price: $${entryPrice.toFixed(4)}`);
    console.log(`   Quantity: ${arbIn.toFixed(6)} ARB\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPosition();

