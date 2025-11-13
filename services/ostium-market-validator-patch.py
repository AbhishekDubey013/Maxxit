#!/usr/bin/env python3
"""
Patch to add market validation to ostium-service.py
This script adds market validation before trade execution
"""

import re

# Read the original file
with open('ostium-service.py', 'r') as f:
    content = f.read()

# Find the /open-position endpoint and update it
# Look for the section where we validate market and add proper validation

# Pattern to find the market validation section
pattern = r"(known_markets = \{[^}]+\}\s+asset_index = known_markets\.get\(market\.upper\(\)\))"

replacement = """# Validate market availability BEFORE attempting trade
        asset_index, is_available, market_name = validate_market(market)
        
        if not is_available:
            logger.warning(f"Market {market} not available on Ostium")
            return jsonify({
                "success": False,
                "error": f"Market {market} is not available on Ostium. Available markets: BTC, ETH, SOL",
                "availableMarkets": list(get_available_markets().keys())
            }), 400
        
        logger.info(f"✅ Market validated: {market_name} (index: {asset_index})")"""

# Apply the replacement
updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Also add a new endpoint for checking available markets
new_endpoint = '''

@app.route('/available-markets', methods=['GET'])
def available_markets():
    """
    Get list of available trading markets
    Returns: { "markets": { "BTC": {...}, "ETH": {...}, ... } }
    """
    try:
        markets = get_available_markets(refresh=request.args.get('refresh') == 'true')
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
'''

# Find where to insert the new endpoints (before the main block)
main_block_pattern = r"(if __name__ == '__main__':)"
updated_content = re.sub(main_block_pattern, new_endpoint + r"\n\n\1", updated_content)

# Write the updated file
with open('ostium-service-updated.py', 'w') as f:
    f.write(updated_content)

print("✅ Patch created: ostium-service-updated.py")
print("📝 Review the changes and then:")
print("   mv ostium-service.py ostium-service-backup.py")
print("   mv ostium-service-updated.py ostium-service.py")

