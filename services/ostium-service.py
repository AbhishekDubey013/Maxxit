#!/usr/bin/env python3
"""
Ostium Trading Service
Flask service for Ostium perpetual DEX integration using official Python SDK
Similar to hyperliquid-service.py but for Arbitrum-based Ostium
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
import traceback

# Ostium SDK imports
try:
    from ostium_python_sdk import OstiumSDK
except ImportError:
    print("ERROR: ostium-python-sdk not installed. Run: pip install ostium-python-sdk")
    exit(1)

# Setup
app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('logs/ostium-service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
OSTIUM_TESTNET = os.getenv('OSTIUM_TESTNET', 'true').lower() == 'true'
OSTIUM_RPC_URL = os.getenv('OSTIUM_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc')
PORT = int(os.getenv('OSTIUM_SERVICE_PORT', '5002'))

logger.info(f"🚀 Ostium Service Starting...")
logger.info(f"   Network: {'TESTNET' if OSTIUM_TESTNET else 'MAINNET'}")
logger.info(f"   RPC URL: {OSTIUM_RPC_URL}")

# SDK Cache
sdk_cache = {}


def get_sdk(private_key: str, use_delegation: bool = False) -> OstiumSDK:
    """Get or create SDK instance with caching"""
    cache_key = f"{private_key[:10]}_{use_delegation}"
    
    if cache_key not in sdk_cache:
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk_cache[cache_key] = OstiumSDK(
            network=network,
            private_key=private_key,
            rpc_url=OSTIUM_RPC_URL
        )
        logger.info(f"Created new SDK instance (delegation={use_delegation})")
    
    return sdk_cache[cache_key]


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "ostium",
        "network": "testnet" if OSTIUM_TESTNET else "mainnet",
        "timestamp": datetime.utcnow().isoformat()
    })


@app.route('/balance', methods=['POST'])
def get_balance():
    """
    Get user's Ostium balance
    Body: { "address": "0x..." }
    """
    try:
        data = request.json
        address = data.get('address')
        
        if not address:
            return jsonify({"success": False, "error": "Missing address"}), 400
        
        # Use a dummy key for read-only operations
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk = OstiumSDK(network=network, rpc_url=OSTIUM_RPC_URL)
        
        # Get balances
        usdc_balance = sdk.balance.get_usdc_balance(address)
        eth_balance = sdk.balance.get_ether_balance(address)
        
        logger.info(f"Balance check for {address}: {usdc_balance} USDC")
        
        return jsonify({
            "success": True,
            "address": address,
            "usdcBalance": str(usdc_balance),
            "ethBalance": str(eth_balance)
        })
    
    except Exception as e:
        logger.error(f"Balance check error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/positions', methods=['POST'])
def get_positions():
    """
    Get open positions for an address
    Body: { "address": "0x..." }
    """
    try:
        data = request.json
        address = data.get('address')
        
        if not address:
            return jsonify({"success": False, "error": "Missing address"}), 400
        
        # Query via GraphQL subgraph
        network = NetworkConfig.testnet() if OSTIUM_TESTNET else NetworkConfig.mainnet()
        sdk = OstiumSDK(network=network, rpc_url=OSTIUM_RPC_URL)
        
        # Get open trades from subgraph
        open_trades = sdk.get_open_trades(address)
        
        # Format positions
        positions = []
        for trade in open_trades:
            positions.append({
                "market": trade.get('pairIndex'),
                "side": "long" if trade.get('buy') else "short",
                "size": float(trade.get('positionSize', 0)),
                "entryPrice": float(trade.get('openPrice', 0)),
                "leverage": float(trade.get('leverage', 1)),
                "unrealizedPnl": float(trade.get('pnl', 0)),
                "tradeId": trade.get('index')
            })
        
        logger.info(f"Found {len(positions)} open positions for {address}")
        
        return jsonify({
            "success": True,
            "positions": positions
        })
    
    except Exception as e:
        logger.error(f"Get positions error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/open-position', methods=['POST'])
def open_position():
    """
    Open a position on Ostium
    Body: {
        "privateKey": "0x...",        # Agent's private key
        "market": "BTC-USD",           # Trading pair
        "size": 0.01,                  # Position size
        "side": "long",                # "long" or "short"
        "leverage": 10,                # Leverage multiplier
        "useDelegation": false,        # Whether trading on behalf of user
        "userAddress": "0x..."         # Required if useDelegation=true
    }
    """
    try:
        data = request.json
        private_key = data.get('privateKey')
        market = data.get('market')
        size = float(data.get('size'))
        side = data.get('side', 'long')
        leverage = float(data.get('leverage', 10))
        use_delegation = data.get('useDelegation', False)
        user_address = data.get('userAddress')
        
        # Validation
        if not all([private_key, market, size]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: privateKey, market, size"
            }), 400
        
        if use_delegation and not user_address:
            return jsonify({
                "success": False,
                "error": "userAddress required when useDelegation=true"
            }), 400
        
        # Get SDK instance
        sdk = get_sdk(private_key, use_delegation)
        
        # Prepare trade parameters
        trade_params = {
            'pairIndex': market,
            'positionSize': size,
            'buy': side.lower() == 'long',
            'leverage': leverage,
            'tp': 0,  # Take profit (0 = none)
            'sl': 0,  # Stop loss (0 = none)
        }
        
        if use_delegation:
            trade_params['trader'] = user_address
        
        # Get current price
        price_data = sdk.price.get_price(market)
        current_price = float(price_data.get('price', 0))
        
        logger.info(f"Opening {side} position: {size} {market} @ {current_price} (leverage: {leverage}x)")
        
        # Execute trade
        result = sdk.ostium.perform_trade(trade_params, at_price=current_price)
        
        logger.info(f"✅ Position opened: {result}")
        
        return jsonify({
            "success": True,
            "result": {
                "txHash": result.get('transactionHash', ''),
                "market": market,
                "side": side,
                "size": size,
                "entryPrice": current_price,
                "leverage": leverage
            }
        })
    
    except Exception as e:
        logger.error(f"Open position error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/close-position', methods=['POST'])
def close_position():
    """
    Close a position (idempotent)
    Body: {
        "privateKey": "0x...",
        "market": "BTC-USD",
        "useDelegation": false,
        "userAddress": "0x..."  # If delegation
    }
    """
    try:
        data = request.json
        private_key = data.get('privateKey')
        market = data.get('market')
        use_delegation = data.get('useDelegation', False)
        user_address = data.get('userAddress')
        
        if not all([private_key, market]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: privateKey, market"
            }), 400
        
        # Get SDK
        sdk = get_sdk(private_key, use_delegation)
        
        # Check if position exists
        address_to_check = user_address if use_delegation else sdk.ostium.get_public_address()
        open_trades = sdk.get_open_trades(address_to_check)
        
        # Find matching trade
        trade_to_close = None
        for trade in open_trades:
            if trade.get('pairIndex') == market:
                trade_to_close = trade
                break
        
        # Idempotency: if no position, return success
        if not trade_to_close:
            logger.info(f"No open position for {market} - already closed")
            return jsonify({
                "success": True,
                "message": "No open position to close",
                "closePnl": 0
            })
        
        # Close the trade
        trade_index = trade_to_close.get('index')
        logger.info(f"Closing position: {market} (index: {trade_index})")
        
        result = sdk.ostium.close_trade(trade_index)
        
        # Get realized PnL from result
        realized_pnl = float(trade_to_close.get('pnl', 0))
        
        logger.info(f"✅ Position closed: PnL = ${realized_pnl:.2f}")
        
        return jsonify({
            "success": True,
            "result": {
                "txHash": result.get('transactionHash', ''),
                "market": market,
                "closePnl": realized_pnl
            },
            "closePnl": realized_pnl
        })
    
    except Exception as e:
        logger.error(f"Close position error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/transfer', methods=['POST'])
def transfer_usdc():
    """
    Transfer USDC (for profit share collection)
    Body: {
        "agentPrivateKey": "0x...",   # Agent's key
        "toAddress": "0x...",          # Platform wallet
        "amount": 10.5,                # USDC amount
        "vaultAddress": "0x..."        # User's address (if delegation)
    }
    """
    try:
        data = request.json
        agent_key = data.get('agentPrivateKey')
        to_address = data.get('toAddress')
        amount = float(data.get('amount'))
        vault_address = data.get('vaultAddress')  # User's wallet for delegation
        
        if not all([agent_key, to_address, amount]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: agentPrivateKey, toAddress, amount"
            }), 400
        
        # Get SDK with delegation if vault_address provided
        use_delegation = vault_address is not None
        sdk = get_sdk(agent_key, use_delegation)
        
        logger.info(f"Transferring {amount} USDC to {to_address}")
        if vault_address:
            logger.info(f"   From user: {vault_address} (via delegation)")
        
        # Execute transfer (withdraw to platform wallet)
        result = sdk.ostium.withdraw(
            amount=amount,
            destination=to_address
        )
        
        logger.info(f"✅ Transfer complete: {result.get('transactionHash')}")
        
        return jsonify({
            "success": True,
            "result": {
                "txHash": result.get('transactionHash', ''),
                "amount": amount,
                "to": to_address
            }
        })
    
    except Exception as e:
        logger.error(f"Transfer error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/approve-agent', methods=['POST'])
def approve_agent():
    """
    User approves agent to trade on their behalf
    Body: {
        "userPrivateKey": "0x...",  # User's key
        "agentAddress": "0x..."      # Agent to approve
    }
    """
    try:
        data = request.json
        user_key = data.get('userPrivateKey')
        agent_address = data.get('agentAddress')
        
        if not all([user_key, agent_address]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: userPrivateKey, agentAddress"
            }), 400
        
        # User SDK (no delegation)
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk = OstiumSDK(
            network=network,
            private_key=user_key,
            rpc_url=OSTIUM_RPC_URL
        )
        
        logger.info(f"User approving agent: {agent_address}")
        
        # Call setDelegate on the Ostium Trading contract
        trading_contract = sdk.ostium.ostium_trading_contract
        web3 = sdk.ostium.web3
        
        # Get user account
        user_account = web3.eth.account.from_key(user_key)
        
        # Build the transaction
        tx = trading_contract.functions.setDelegate(agent_address).build_transaction({
            'from': user_account.address,
            'nonce': web3.eth.get_transaction_count(user_account.address),
            'gas': 200000,
            'gasPrice': web3.eth.gas_price,
        })
        
        # Sign the transaction
        signed_tx = web3.eth.account.sign_transaction(tx, user_key)
        
        # Send the transaction
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        logger.info(f"Transaction sent: {tx_hash.hex()}")
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            logger.info(f"✅ Agent approved! Tx hash: {tx_hash.hex()}")
            
            return jsonify({
                "success": True,
                "message": "Agent approved successfully on Ostium smart contracts",
                "agentAddress": agent_address,
                "transactionHash": tx_hash.hex(),
                "blockNumber": receipt['blockNumber'],
                "gasUsed": receipt['gasUsed']
            })
        else:
            logger.error(f"Transaction failed: {tx_hash.hex()}")
            return jsonify({
                "success": False,
                "error": "Transaction reverted",
                "transactionHash": tx_hash.hex()
            }), 500
    
    except Exception as e:
        logger.error(f"Approval error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/faucet', methods=['POST'])
def request_faucet():
    """
    Request testnet USDC from faucet
    Body: { "address": "0x..." }
    """
    try:
        data = request.json
        address = data.get('address')
        
        if not address:
            return jsonify({"success": False, "error": "Missing address"}), 400
        
        if not OSTIUM_TESTNET:
            return jsonify({
                "success": False,
                "error": "Faucet only available on testnet"
            }), 400
        
        # Create SDK for faucet access
        network = NetworkConfig.testnet()
        sdk = OstiumSDK(network=network, rpc_url=OSTIUM_RPC_URL)
        
        # Check if can request
        if not sdk.faucet.can_request_tokens(address):
            next_time = sdk.faucet.get_next_request_time(address)
            return jsonify({
                "success": False,
                "error": f"Cannot request yet. Next request at: {next_time}"
            }), 400
        
        # Get amount
        amount = sdk.faucet.get_token_amount()
        
        # Request tokens
        receipt = sdk.faucet.request_tokens()
        
        logger.info(f"Faucet: {amount} USDC sent to {address}")
        
        return jsonify({
            "success": True,
            "amount": str(amount),
            "txHash": receipt.get('transactionHash', '').hex()
        })
    
    except Exception as e:
        logger.error(f"Faucet error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/market-info', methods=['GET'])
def get_market_info():
    """Get available trading pairs and market info"""
    try:
        network = NetworkConfig.testnet() if OSTIUM_TESTNET else NetworkConfig.mainnet()
        sdk = OstiumSDK(network=network, rpc_url=OSTIUM_RPC_URL)
        
        # Get available pairs
        pairs = sdk.get_formatted_pairs_details()
        
        return jsonify({
            "success": True,
            "pairs": pairs
        })
    
    except Exception as e:
        logger.error(f"Market info error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    logger.info(f"🚀 Starting Ostium Service on port {PORT}")
    logger.info(f"   Network: {'TESTNET (Arbitrum Sepolia)' if OSTIUM_TESTNET else 'MAINNET'}")
    
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False
    )

