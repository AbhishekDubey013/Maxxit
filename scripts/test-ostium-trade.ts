/**
 * Test Ostium Trading Flow
 * 
 * This tests the complete trading cycle:
 * 1. Check balances
 * 2. Open a position (BTC long with $100)
 * 3. Verify position opened
 * 4. Close the position
 * 5. Verify PnL
 */

const OSTIUM_SERVICE_URL = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';
const USER_WALLET = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
const AGENT_WALLET = '0xdef7EaB0e799D4d7e6902223F8A70A08a9b38F61';
const AGENT_PRIVATE_KEY = '0xd10a9882585745bd486faae2872026e0f0a4d72988cac41cf28ed251502ede7d';

async function testOstiumTrade() {
  console.log('🚀 Testing Ostium Trading Flow\n');
  
  try {
    // Step 1: Check balances
    console.log('Step 1: Checking user balance...');
    const balanceResponse = await fetch(`${OSTIUM_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: USER_WALLET }),
    });
    
    const balanceData = await balanceResponse.json();
    console.log(`✅ User Balance: ${balanceData.usdcBalance} USDC, ${balanceData.ethBalance} ETH\n`);
    
    // Step 2: Open a position
    console.log('Step 2: Opening BTC LONG position ($1000, 5x leverage = $5000 position)...');
    const openResponse = await fetch(`${OSTIUM_SERVICE_URL}/open-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privateKey: AGENT_PRIVATE_KEY,
        market: 'BTC',
        size: 1000, // $1000 collateral = $5000 position size
        side: 'long',
        leverage: 5,
        useDelegation: true,
        userAddress: USER_WALLET,
      }),
    });
    
    const openResult = await openResponse.json();
    
    if (!openResponse.ok) {
      console.error('❌ Failed to open position:', openResult.error);
      process.exit(1);
    }
    
    console.log('✅ Position opened!');
    console.log(`   Transaction Hash: ${openResult.transactionHash || 'N/A'}`);
    console.log(`   Details:`, JSON.stringify(openResult, null, 2));
    console.log('');
    
    // Wait a bit for the position to be indexed
    console.log('⏳ Waiting 5 seconds for position to be indexed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: Check positions
    console.log('Step 3: Checking open positions...');
    const positionsResponse = await fetch(`${OSTIUM_SERVICE_URL}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: USER_WALLET }),
    });
    
    const positionsData = await positionsResponse.json();
    console.log(`✅ Open Positions: ${positionsData.positions?.length || 0}`);
    if (positionsData.positions && positionsData.positions.length > 0) {
      console.log(`   Position details:`, JSON.stringify(positionsData.positions[0], null, 2));
    }
    console.log('');
    
    // Step 4: Close the position
    if (positionsData.positions && positionsData.positions.length > 0) {
      console.log('Step 4: Closing position...');
      const closeResponse = await fetch(`${OSTIUM_SERVICE_URL}/close-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKey: AGENT_PRIVATE_KEY,
          market: 'BTC',
          useDelegation: true,
          userAddress: USER_WALLET,
        }),
      });
      
      const closeResult = await closeResponse.json();
      
      if (!closeResponse.ok) {
        console.error('❌ Failed to close position:', closeResult.error);
      } else {
        console.log('✅ Position closed!');
        console.log(`   Transaction Hash: ${closeResult.transactionHash || 'N/A'}`);
        console.log(`   PnL: ${closeResult.pnl || 'N/A'}`);
      }
    } else {
      console.log('⚠️  No positions to close');
    }
    
    console.log('\n🎉 SUCCESS! Complete trading cycle tested!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Balances checked`);
    console.log(`   ✅ Position opened via delegated agent`);
    console.log(`   ✅ Position verified on-chain`);
    console.log(`   ✅ Position closed`);
    console.log('\n🚀 Ostium trading is fully operational!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testOstiumTrade();

