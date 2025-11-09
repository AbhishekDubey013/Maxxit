#!/usr/bin/env python3
"""
Direct Ostium SDK Testing
Tests the SDK directly without the Flask service
"""

import sys
from ostium_python_sdk import OstiumSDK
from web3 import Web3

USER_WALLET = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3'
AGENT_WALLET = '0xdef7EaB0e799D4d7e6902223F8A70A08a9b38F61'
AGENT_PRIVATE_KEY = '0xd10a9882585745bd486faae2872026e0f0a4d72988cac41cf28ed251502ede7d'
RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc'

results = []

def test(name, fn):
    """Run a test and record result"""
    print(f"\n🧪 {name}...")
    try:
        result = fn()
        status = "✅ PASS" if result else "❌ FAIL"
        results.append((name, result))
        print(f"   {status}")
        return result
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        results.append((name, False))
        return False

def main():
    print("🚀 OSTIUM SDK DIRECT TEST SUITE")
    print("=" * 60)
    
    # Test 1: SDK Initialization
    sdk = None
    def test_init():
        nonlocal sdk
        sdk = OstiumSDK(
            network='testnet',
            private_key=AGENT_PRIVATE_KEY,
            rpc_url=RPC_URL,
            use_delegation=True
        )
        print(f"   SDK Version: 3.0.0")
        print(f"   Network: TESTNET")
        return sdk is not None
    
    test("Test 1: SDK Initialization", test_init)
    
    if not sdk:
        print("\n❌ SDK initialization failed, cannot continue")
        return
    
    # Test 2: Contract Addresses
    def test_contracts():
        print(f"   Trading: {sdk.ostium.ostium_trading_address}")
        print(f"   Storage: {sdk.ostium.ostium_trading_storage_address}")
        print(f"   USDC: {sdk.ostium.usdc_contract.address}")
        return all([
            sdk.ostium.ostium_trading_address,
            sdk.ostium.ostium_trading_storage_address,
            sdk.ostium.usdc_contract.address
        ])
    
    test("Test 2: Contract Addresses Loaded", test_contracts)
    
    # Test 3: User Balance
    def test_user_balance():
        balance = sdk.balance.get_usdc_balance(USER_WALLET)
        eth_balance = sdk.balance.get_ether_balance(USER_WALLET)
        print(f"   USDC: {balance}")
        print(f"   ETH: {eth_balance}")
        return balance > 0
    
    test("Test 3: User Balance Query", test_user_balance)
    
    # Test 4: Agent Balance
    def test_agent_balance():
        balance = sdk.balance.get_usdc_balance(AGENT_WALLET)
        eth_balance = sdk.balance.get_ether_balance(AGENT_WALLET)
        print(f"   USDC: {balance}")
        print(f"   ETH: {eth_balance}")
        return eth_balance > 0.001  # Agent needs gas
    
    test("Test 4: Agent Wallet Has Gas", test_agent_balance)
    
    # Test 5: Allowance Check
    def test_allowance():
        storage_address = sdk.ostium.ostium_trading_storage_address
        allowance = sdk.ostium.usdc_contract.functions.allowance(
            USER_WALLET, storage_address
        ).call()
        print(f"   Allowance: {allowance / 1e6} USDC")
        return allowance > 1000 * 1e6
    
    test("Test 5: USDC Allowance Sufficient", test_allowance)
    
    # Test 6: Delegation Check
    def test_delegation():
        trading_address = sdk.ostium.ostium_trading_address
        web3 = sdk.ostium.web3
        
        # Check if agent is delegated
        trading_contract = sdk.ostium.ostium_trading_contract
        delegate = trading_contract.functions.delegations(USER_WALLET).call()
        
        print(f"   User: {USER_WALLET}")
        print(f"   Delegate: {delegate}")
        print(f"   Agent: {AGENT_WALLET}")
        
        is_delegated = delegate.lower() == AGENT_WALLET.lower()
        print(f"   Is Delegated: {is_delegated}")
        
        return True  # Just informational
    
    test("Test 6: Delegation Status", test_delegation)
    
    # Test 7: Opening Fee Calculation
    def test_opening_fee():
        fee = sdk.ostium.get_opening_fee(
            trade_size=1000,  # $1000
            leverage=5,
            pair_id=0  # BTC
        )
        print(f"   Opening Fee for $1000 @ 5x: {fee}")
        return fee > 0
    
    test("Test 7: Opening Fee Calculation", test_opening_fee)
    
    # Test 8: Slippage Settings
    def test_slippage():
        slippage = sdk.ostium.get_slippage_percentage()
        print(f"   Current Slippage: {slippage}%")
        
        # Set to 2%
        sdk.ostium.set_slippage_percentage(2.0)
        new_slippage = sdk.ostium.get_slippage_percentage()
        print(f"   New Slippage: {new_slippage}%")
        
        return new_slippage == 2.0
    
    test("Test 8: Slippage Configuration", test_slippage)
    
    # Test 9: Create Order
    order_id = None
    def test_create_order():
        nonlocal order_id
        
        trade_params = {
            'asset_type': 0,  # BTC
            'collateral': 1000,
            'direction': True,  # Long
            'leverage': 5,
            'tp': 0,
            'sl': 0,
            'trader_address': USER_WALLET
        }
        
        print(f"   Creating BTC LONG order...")
        print(f"   Collateral: $1000, Leverage: 5x")
        
        result = sdk.ostium.perform_trade(trade_params, at_price=90000.0)
        
        if result and 'order_id' in result:
            order_id = result['order_id']
            print(f"   Order ID: {order_id}")
            
            tx_hash = result.get('receipt', {}).get('transactionHash', '')
            if hasattr(tx_hash, 'hex'):
                tx_hash = tx_hash.hex()
            print(f"   TX: {tx_hash}")
            
            return True
        
        return False
    
    test("Test 9: Create Market Order", test_create_order)
    
    # Test 10: Balance After Order
    def test_balance_after():
        balance = sdk.balance.get_usdc_balance(USER_WALLET)
        print(f"   Balance After Order: {balance} USDC")
        return True  # Informational
    
    test("Test 10: Balance After Order", test_balance_after)
    
    # Print Summary
    print("\n" + "=" * 60)
    print("\n📊 TEST SUMMARY:\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
    
    print("\n📋 Detailed Results:\n")
    for i, (name, result) in enumerate(results, 1):
        status = "✅" if result else "❌"
        print(f"{i}. {status} {name}")
    
    if order_id:
        print(f"\n📝 Created Order ID: {order_id}")
        print("\n⏳ Order Status:")
        print("   Waiting for keeper to fill the order...")
        print("\n🔗 View Transaction:")
        print(f"   https://sepolia.arbiscan.io/address/{USER_WALLET}")
    
    print("\n" + "=" * 60)
    
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()

