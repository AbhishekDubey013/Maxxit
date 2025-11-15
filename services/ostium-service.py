#!/usr/bin/env python3
"""
Ostium Trading Service
Flask service for Ostium perpetual DEX integration using official Python SDK
Similar to hyperliquid-service.py but for Arbitrum-based Ostium
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
import os
import logging
from datetime import datetime
import traceback
import ssl
import warnings

# Disable SSL warnings for testnet (dev only)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
os.environ['PYTHONHTTPSVERIFY'] = '0'
ssl._create_default_https_context = ssl._create_unverified_context

# Ostium SDK imports
try:
    from ostium_python_sdk import OstiumSDK
except ImportError:
    print("ERROR: ostium-python-sdk not installed. Run: pip install ostium-python-sdk")
    exit(1)

# Monkey-patch the SDK to fix raw_transaction bug
try:
    from web3.types import SignedTransaction
    if not hasattr(SignedTransaction, 'raw_transaction'):
        SignedTransaction.raw_transaction = property(lambda self: self.rawTransaction)
except Exception as e:
    logging.warning(f"Could not apply monkey-patch: {e}")

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

# Available Markets Cache
available_markets_cache = {
    'markets': None,
    'last_updated': None,
    'ttl': 300  # 5 minutes cache
}


def get_sdk(private_key: str, use_delegation: bool = False) -> OstiumSDK:
    """Get or create SDK instance with caching"""
    cache_key = f"{private_key[:10]}_{use_delegation}"
    
    if cache_key not in sdk_cache:
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk_cache[cache_key] = OstiumSDK(
            network=network,
            private_key=private_key,
            rpc_url=OSTIUM_RPC_URL,
            use_delegation=use_delegation  # CRITICAL: Enable delegation mode!
        )
        logger.info(f"Created new SDK instance (delegation={use_delegation})")
    
    return sdk_cache[cache_key]


def get_available_markets(refresh=False):
    """
    Fetch available markets from Database API
    Returns dict: {
        'BTC': {'index': 0, 'name': 'BTC/USD', 'available': True},
        'ETH': {'index': 1, 'name': 'ETH/USD', 'available': True},
        ...
    }
    """
    import time
    import requests
    
    # Check cache
    if not refresh and available_markets_cache['markets'] is not None:
        if available_markets_cache['last_updated'] is not None:
            age = time.time() - available_markets_cache['last_updated']
            if age < available_markets_cache['ttl']:
                return available_markets_cache['markets']
    
    logger.info("Fetching available markets from database API...")
    
    try:
        # Fetch from database API
        api_url = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')
        response = requests.get(f"{api_url}/api/venue-markets/available?venue=OSTIUM", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('markets'):
                markets = data['markets']
                available_markets_cache['markets'] = markets
                available_markets_cache['last_updated'] = time.time()
                logger.info(f"✅ Loaded {len(markets)} available markets from database")
                return markets
        
        # If API call fails, use fallback
        raise Exception(f"API returned status {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to fetch markets from API: {e}")
        # Return known markets as fallback
        fallback = {
            'BTC': {'index': 0, 'name': 'BTC/USD', 'available': True},
            'ETH': {'index': 1, 'name': 'ETH/USD', 'available': True},
            'SOL': {'index': 9, 'name': 'SOL/USD', 'available': True},
            'HYPE': {'index': 41, 'name': 'HYPE/USD', 'available': True},
            'XRP': {'index': 39, 'name': 'XRP/USD', 'available': True},
            'LINK': {'index': 42, 'name': 'LINK/USD', 'available': True},
            'ADA': {'index': 43, 'name': 'ADA/USD', 'available': True},
        }
        available_markets_cache['markets'] = fallback
        available_markets_cache['last_updated'] = time.time()
        logger.info(f"⚠️  Using fallback markets ({len(fallback)} markets)")
        return fallback


def validate_market(token_symbol: str):
    """
    Validate if a market is available on Ostium
    Returns: (asset_index, is_available, market_name)
    """
    token_symbol = token_symbol.upper()
    markets = get_available_markets()
    
    if token_symbol in markets:
        market_info = markets[token_symbol]
        return market_info['index'], True, market_info['name']
    else:
        # Market not found
        return None, False, None


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
        
        # Convert to checksummed address
        try:
            address = Web3.to_checksum_address(address)
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid address format: {str(e)}"}), 400
        
        # Use a dummy key for read-only operations  
        # SDK requires a private key even for read operations
        dummy_key = '0x' + '1' * 64
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk = OstiumSDK(network=network, private_key=dummy_key, rpc_url=OSTIUM_RPC_URL)
        
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
        
        # Convert to checksummed address
        try:
            address = Web3.to_checksum_address(address)
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid address format: {str(e)}"}), 400
        
        # Create SDK instance
        dummy_key = '0x' + '1' * 64
        network = 'testnet' if OSTIUM_TESTNET else 'mainnet'
        sdk = OstiumSDK(network=network, private_key=dummy_key, rpc_url=OSTIUM_RPC_URL)
        
        # Get open trades using SDK (it's async, so we need to run it)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(sdk.get_open_trades(trader_address=address))
        loop.close()
        
        # Parse result - SDK returns tuple (trades_list, trader_address)
        open_trades = []
        if isinstance(result, tuple) and len(result) > 0:
            open_trades = result[0] if isinstance(result[0], list) else []
        
        # Format positions
        positions = []
        for trade in open_trades:
            try:
                pair_info = trade.get('pair', {})
                market_symbol = f"{pair_info.get('from', 'UNKNOWN')}/{pair_info.get('to', 'USD')}"
                
                positions.append({
                    "market": market_symbol,
                    "side": "long" if trade.get('isBuy') else "short",
                    "size": float(int(trade.get('collateral', 0)) / 1e6),  # Collateral in USDC
                    "entryPrice": float(int(trade.get('openPrice', 0)) / 1e18),  # Price
                    "leverage": float(int(trade.get('leverage', 0)) / 100),  # Leverage
                    "unrealizedPnl": 0.0,  # TODO: Calculate PnL
                    "tradeId": trade.get('tradeID', trade.get('index', '0'))
                })
            except Exception as parse_error:
                logger.error(f"Error parsing trade: {parse_error}")
                continue
        
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
    Open a position on Ostium (supports both formats)
    Format 1 (agent-based):
    {
        "agentAddress": "0x...",      # Agent's wallet address (agent's private key from env)
        "userAddress": "0x...",        # User's wallet (trading on behalf of)
        "market": "HYPE",              # Token symbol
        "side": "long",                # "long" or "short"
        "collateral": 100,             # Collateral in USDC
        "leverage": 3                  # Leverage multiplier
    }
    Format 2 (legacy):
    {
        "privateKey": "0x...",
        "market": "BTC",
        "size": 0.01,
        "side": "long",
        "leverage": 10,
        "useDelegation": false,
        "userAddress": "0x..."
    }
    """
    try:
        data = request.json
        
        # Support both agentAddress and privateKey formats
        agent_address = data.get('agentAddress')
        private_key = data.get('privateKey')
        
        # If agentAddress is provided, look up agent's private key from database
        if agent_address:
            try:
                # Import here to avoid circular dependency
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                # Get database URL from environment
                database_url = os.getenv('DATABASE_URL')
                if not database_url:
                    return jsonify({
                        "success": False,
                        "error": "DATABASE_URL not configured"
                    }), 500
                
                # Query wallet pool for agent's private key
                conn = psycopg2.connect(database_url)
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute(
                    "SELECT private_key FROM wallet_pool WHERE LOWER(address) = LOWER(%s)",
                    (agent_address,)
                )
                wallet = cur.fetchone()
                cur.close()
                conn.close()
                
                if not wallet:
                    return jsonify({
                        "success": False,
                        "error": f"Agent address {agent_address} not found in wallet pool"
                    }), 404
                
                private_key = wallet['private_key']
                use_delegation = True
                logger.info(f"Found agent key for {agent_address} in wallet pool")
                
            except Exception as e:
                logger.error(f"Error fetching agent key: {e}")
                return jsonify({
                    "success": False,
                    "error": f"Failed to fetch agent key: {str(e)}"
                }), 500
        else:
            use_delegation = data.get('useDelegation', False)
        
        # Handle collateral vs size
        collateral = data.get('collateral')
        size = data.get('size')
        position_size = float(collateral) if collateral is not None else float(size) if size is not None else None
        
        market = data.get('market')
        side = data.get('side', 'long')
        leverage = float(data.get('leverage', 10))
        user_address = data.get('userAddress')
        
        # Validation
        if not all([private_key, market, position_size]):
            return jsonify({
                "success": False,
                "error": "Missing required fields"
            }), 400
        
        if use_delegation and not user_address:
            return jsonify({
                "success": False,
                "error": "userAddress required for delegation"
            }), 400
        
        # Checksum addresses
        if user_address:
            try:
                user_address = Web3.to_checksum_address(user_address)
            except:
                return jsonify({"success": False, "error": "Invalid userAddress format"}), 400
        
        # Get SDK instance
        sdk = get_sdk(private_key, use_delegation)
        
        logger.info(f"Opening {side} position: {position_size} USDC on {market} (leverage: {leverage}x, delegation: {use_delegation})")
        if use_delegation:
            logger.info(f"Trading on behalf of: {user_address}")
        
        # Try to find market dynamically instead of hardcoding
        # Ostium SDK should handle market availability internally
        # We'll use a flexible approach that works with any token
        
        # Validate market availability using the validation function
        asset_index, is_available, market_name = validate_market(market)
        
        if not is_available:
            available_markets_list = ', '.join(get_available_markets().keys())
            error_msg = f"Market {market} is not available on Ostium. Available markets: {available_markets_list}"
            logger.warning(error_msg)
            return jsonify({
                "success": False,
                "error": error_msg,
                "availableMarkets": list(get_available_markets().keys())
            }), 400
        
        logger.info(f"✅ Market validated: {market_name} (index: {asset_index})")
        
        trade_params = {
            'asset_type': asset_index,
            'collateral': position_size,
            'direction': side.lower() == 'long',
            'leverage': leverage,
            'tp': 0,
            'sl': 0,
        }
        
        if use_delegation:
            trade_params['trader_address'] = user_address
        
        # Try to get current price from a price oracle or default
        # For testnet, use reasonable defaults
        try:
            # TODO: Integrate with price oracle (CoinGecko, Chainlink, etc.)
            price_defaults = {
                'BTC': 90000.0,
                'ETH': 3000.0,
                'SOL': 200.0,
            }
            current_price = price_defaults.get(market.upper(), 100.0)
            logger.info(f"Using reference price for {market}: ${current_price}")
        except Exception as e:
            logger.warning(f"Could not fetch price for {market}, using default: {e}")
            current_price = 100.0
        
        # Execute trade
        logger.info(f"📤 Calling perform_trade with params: {trade_params}, price: {current_price}")
        result = sdk.ostium.perform_trade(trade_params, at_price=current_price)
        
        # Extract order_id and receipt
        order_id = result.get('order_id') if isinstance(result, dict) else None
        receipt = result.get('receipt') if isinstance(result, dict) else None
        
        logger.info(f"📥 Order created! order_id: {order_id}")
        
        if not order_id:
            raise Exception("No order_id returned from SDK - trade may have failed")
        
        # TODO: Track order until filled
        # For now, return the order_id
        logger.info(f"✅ Order submitted: {order_id} (waiting for keeper to fill)")
        
        # Convert Web3 AttributeDict to regular dict for JSON serialization
        tx_hash = ''
        if receipt:
            tx_hash = receipt.get('transactionHash', receipt.get('hash', ''))
            if hasattr(tx_hash, 'hex'):
                tx_hash = tx_hash.hex()
        
        return jsonify({
            "success": True,
            "orderId": order_id,
            "tradeId": str(order_id),  # Alias for compatibility
            "transactionHash": str(tx_hash) if tx_hash else '',
            "txHash": str(tx_hash) if tx_hash else '',  # Alias for compatibility
            "status": "pending",
            "message": "Order created, waiting for keeper to fill position",
            "result": {
                "market": market,
                "side": side,
                "collateral": position_size,
                "leverage": leverage,
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
    Body (Format 1 - Agent):
    {
        "agentAddress": "0x...",
        "userAddress": "0x...",
        "market": "BTC",
        "tradeId": "12345"  # Optional
    }
    Body (Format 2 - Legacy):
    {
        "privateKey": "0x...",
        "market": "BTC-USD",
        "useDelegation": false,
        "userAddress": "0x..."
    }
    """
    try:
        data = request.json
        
        # Support both agentAddress and privateKey formats
        agent_address = data.get('agentAddress')
        private_key = data.get('privateKey')
        
        # If agentAddress is provided, look up agent's private key from database
        if agent_address:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                database_url = os.getenv('DATABASE_URL')
                if not database_url:
                    return jsonify({
                        "success": False,
                        "error": "DATABASE_URL not configured"
                    }), 500
                
                conn = psycopg2.connect(database_url)
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute(
                    "SELECT private_key FROM wallet_pool WHERE LOWER(address) = LOWER(%s)",
                    (agent_address,)
                )
                wallet = cur.fetchone()
                cur.close()
                conn.close()
                
                if not wallet:
                    return jsonify({
                        "success": False,
                        "error": f"Agent address {agent_address} not found in wallet pool"
                    }), 404
                
                private_key = wallet['private_key']
                use_delegation = True
                logger.info(f"Found agent key for {agent_address} in wallet pool")
                
            except Exception as e:
                logger.error(f"Error fetching agent key: {e}")
                return jsonify({
                    "success": False,
                    "error": f"Failed to fetch agent key: {str(e)}"
                }), 500
        else:
            use_delegation = data.get('useDelegation', False)
        
        market = data.get('market')
        trade_id = data.get('tradeId')
        user_address = data.get('userAddress')
        
        if not all([private_key, market]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: agentAddress/privateKey, market"
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




@app.route('/available-markets', methods=['GET'])
def available_markets():
    """
    Get list of available trading markets
    GET /available-markets?refresh=true (optional: refresh cache)
    Returns: { "success": true, "markets": { "BTC": {...}, "ETH": {...}, ... }, "count": 3 }
    """
    try:
        refresh = request.args.get('refresh', 'false').lower() == 'true'
        markets = get_available_markets(refresh=refresh)
        return jsonify({
            "success": True,
            "markets": markets,
            "count": len(markets)
        })
    except Exception as e:
        logger.error(f"Failed to fetch markets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/validate-market', methods=['POST'])
def validate_market_endpoint():
    """
    Validate if a specific market is available
    Body: { "market": "BTC" }
    Returns: { "success": true, "market": "BTC", "isAvailable": true, "marketName": "BTC/USD", "assetIndex": 0 }
    """
    try:
        data = request.json
        market = data.get('market', '').upper()
        
        if not market:
            return jsonify({"success": False, "error": "Missing market parameter"}), 400
        
        asset_index, is_available, market_name = validate_market(market)
        
        return jsonify({
            "success": True,
            "market": market,
            "isAvailable": is_available,
            "marketName": market_name,
            "assetIndex": asset_index
        })
    except Exception as e:
        logger.error(f"Market validation error: {e}")
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

