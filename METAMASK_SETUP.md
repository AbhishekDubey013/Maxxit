# MetaMask Setup for Hyperliquid

Complete guide to configure MetaMask for Hyperliquid testnet and mainnet, plus Arbitrum Sepolia.

## Quick Add to MetaMask

### 🧪 Hyperliquid Testnet

**Network Details:**
```
Network Name: Hyperliquid Testnet
RPC URL: https://api.hyperliquid-testnet.xyz/evm
Chain ID: 998 (or check latest)
Currency Symbol: HYPE
Block Explorer: https://explorer.hyperliquid-testnet.xyz
```

**Add to MetaMask:**

1. Open MetaMask
2. Click network dropdown (top left)
3. Click "Add Network"
4. Click "Add a network manually"
5. Enter the details above
6. Click "Save"

### ⚡ Hyperliquid Mainnet

**Network Details:**
```
Network Name: Hyperliquid
RPC URL: https://api.hyperliquid.xyz/evm
Chain ID: 42161 (or check latest)
Currency Symbol: HYPE
Block Explorer: https://explorer.hyperliquid.xyz
```

**Note:** Hyperliquid primarily operates through their L1, not EVM. For most operations, use the Hyperliquid app directly.

### 🔵 Arbitrum Sepolia (For Testing)

**Network Details:**
```
Network Name: Arbitrum Sepolia
RPC URL: https://sepolia-rollup.arbitrum.io/rpc
Chain ID: 421614
Currency Symbol: ETH
Block Explorer: https://sepolia.arbiscan.io
```

This is where your Safe wallet lives for testnet testing.

---

## Automated Setup Script

### Option 1: One-Click Add (HTML)

Save this as `add-networks.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Add Hyperliquid Networks to MetaMask</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        button {
            background: #f6851b;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
            width: 100%;
        }
        button:hover {
            background: #e2761b;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        h2 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <h1>🦊 Add Networks to MetaMask</h1>
    
    <div class="section">
        <h2>🧪 Hyperliquid Testnet</h2>
        <p>Add Hyperliquid testnet for testing</p>
        <button onclick="addHyperliquidTestnet()">
            Add Hyperliquid Testnet
        </button>
    </div>
    
    <div class="section">
        <h2>🔵 Arbitrum Sepolia</h2>
        <p>Add Arbitrum Sepolia testnet (where your Safe lives)</p>
        <button onclick="addArbitrumSepolia()">
            Add Arbitrum Sepolia
        </button>
    </div>
    
    <div class="section">
        <h2>⚡ Arbitrum One (Mainnet)</h2>
        <p>Add Arbitrum mainnet for production</p>
        <button onclick="addArbitrumOne()">
            Add Arbitrum One
        </button>
    </div>

    <script>
        async function addHyperliquidTestnet() {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x3E6', // 998 in hex
                        chainName: 'Hyperliquid Testnet',
                        nativeCurrency: {
                            name: 'HYPE',
                            symbol: 'HYPE',
                            decimals: 18
                        },
                        rpcUrls: ['https://api.hyperliquid-testnet.xyz/evm'],
                        blockExplorerUrls: ['https://explorer.hyperliquid-testnet.xyz']
                    }]
                });
                alert('✅ Hyperliquid Testnet added!');
            } catch (error) {
                console.error(error);
                alert('❌ Error: ' + error.message);
            }
        }

        async function addArbitrumSepolia() {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x66EEE', // 421614 in hex
                        chainName: 'Arbitrum Sepolia',
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                        blockExplorerUrls: ['https://sepolia.arbiscan.io']
                    }]
                });
                alert('✅ Arbitrum Sepolia added!');
            } catch (error) {
                console.error(error);
                alert('❌ Error: ' + error.message);
            }
        }

        async function addArbitrumOne() {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xA4B1', // 42161 in hex
                        chainName: 'Arbitrum One',
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                        blockExplorerUrls: ['https://arbiscan.io']
                    }]
                });
                alert('✅ Arbitrum One added!');
            } catch (error) {
                console.error(error);
                alert('❌ Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

### Option 2: Script to Add Networks

```bash
#!/bin/bash
# save as add-networks.sh

echo "🦊 MetaMask Network Configuration"
echo ""
echo "To add networks to MetaMask:"
echo ""
echo "1. Open MetaMask"
echo "2. Click network dropdown"
echo "3. Click 'Add Network'"
echo "4. Enter these details:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 HYPERLIQUID TESTNET"
echo "   Network Name: Hyperliquid Testnet"
echo "   RPC URL: https://api.hyperliquid-testnet.xyz/evm"
echo "   Chain ID: 998"
echo "   Symbol: HYPE"
echo "   Explorer: https://explorer.hyperliquid-testnet.xyz"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔵 ARBITRUM SEPOLIA (for Safe Wallet)"
echo "   Network Name: Arbitrum Sepolia"
echo "   RPC URL: https://sepolia-rollup.arbitrum.io/rpc"
echo "   Chain ID: 421614"
echo "   Symbol: ETH"
echo "   Explorer: https://sepolia.arbiscan.io"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚡ ARBITRUM ONE (Mainnet)"
echo "   Network Name: Arbitrum One"
echo "   RPC URL: https://arb1.arbitrum.io/rpc"
echo "   Chain ID: 42161"
echo "   Symbol: ETH"
echo "   Explorer: https://arbiscan.io"
echo ""
```

---

## Step-by-Step Manual Setup

### Adding Arbitrum Sepolia (for Testnet)

**Why:** Your Safe wallet and bridge operations happen on Arbitrum Sepolia for testnet.

1. **Open MetaMask**
   - Click the network dropdown (usually says "Ethereum Mainnet")

2. **Add Network**
   - Click "Add Network" at bottom
   - Or click "Settings" → "Networks" → "Add Network"

3. **Enter Details:**
   ```
   Network Name: Arbitrum Sepolia
   New RPC URL: https://sepolia-rollup.arbitrum.io/rpc
   Chain ID: 421614
   Currency Symbol: ETH
   Block Explorer URL: https://sepolia.arbiscan.io
   ```

4. **Save** and switch to Arbitrum Sepolia

5. **Verify:** You should see "Arbitrum Sepolia" in the network dropdown

### Adding Arbitrum One (for Mainnet)

**Why:** Your Safe wallet and bridge operations happen on Arbitrum One for production.

1. **Open MetaMask** → Network dropdown → Add Network

2. **Enter Details:**
   ```
   Network Name: Arbitrum One
   New RPC URL: https://arb1.arbitrum.io/rpc
   Chain ID: 42161
   Currency Symbol: ETH
   Block Explorer URL: https://arbiscan.io
   ```

3. **Save** and you're done!

---

## Adding Test Tokens

### Add USDC on Arbitrum Sepolia

1. **Switch to Arbitrum Sepolia** in MetaMask

2. **Click "Import tokens"** (at bottom)

3. **Enter Token Details:**
   ```
   Token Contract Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
   Token Symbol: USDC
   Token Decimal: 6
   ```

4. **Click "Add Custom Token"**

5. **You should now see USDC balance**

### Add USDC on Arbitrum One (Mainnet)

1. **Switch to Arbitrum One**

2. **Import tokens**

3. **Enter:**
   ```
   Token Contract Address: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
   Token Symbol: USDC
   Token Decimal: 6
   ```

4. **Add and done!**

---

## Troubleshooting

### Can't Connect MetaMask to Hyperliquid

**Issue:** Hyperliquid is primarily a custom L1, not fully EVM-compatible.

**Solution:** For most Hyperliquid operations, use:
- Hyperliquid App directly: https://app.hyperliquid-testnet.xyz
- Our Python service for API calls
- MetaMask only needed for Arbitrum operations (Safe, bridging)

### Wrong Network

**Check your network:**
```bash
# In browser console:
window.ethereum.request({ method: 'eth_chainId' })

# Should return:
# "0x66eee" (421614) for Arbitrum Sepolia
# "0xa4b1" (42161) for Arbitrum One
```

### Transaction Fails

**Common causes:**
1. Wrong network selected
2. Insufficient gas (ETH)
3. Insufficient token balance
4. RPC URL issue

**Solution:**
- Switch to correct network
- Get testnet ETH: https://faucet.quicknode.com/arbitrum/sepolia
- Check balance in MetaMask

### Can't See Safe Wallet

**Issue:** Safe not showing in MetaMask

**Why:** Safe wallets are smart contracts, not regular wallets.

**Solution:** 
- Use Safe app: https://app.safe.global
- Or deploy agent through our app
- MetaMask wallet interacts with Safe, but Safe balance is separate

---

## Quick Reference

### Chain IDs
```
Arbitrum Sepolia: 421614 (0x66eee)
Arbitrum One: 42161 (0xa4b1)
Ethereum Sepolia: 11155111 (0xaa36a7)
Ethereum Mainnet: 1 (0x1)
```

### RPC URLs
```
Arbitrum Sepolia: https://sepolia-rollup.arbitrum.io/rpc
Arbitrum One: https://arb1.arbitrum.io/rpc
Alternative Arb One: https://arbitrum.llamarpc.com
```

### Explorers
```
Arbitrum Sepolia: https://sepolia.arbiscan.io
Arbitrum One: https://arbiscan.io
Hyperliquid Testnet: https://app.hyperliquid-testnet.xyz
Hyperliquid Mainnet: https://app.hyperliquid.xyz
```

### Faucets
```
Arbitrum Sepolia ETH: https://faucet.quicknode.com/arbitrum/sepolia
Arbitrum Sepolia ETH: https://www.alchemy.com/faucets/arbitrum-sepolia
Hyperliquid Testnet USDC: https://app.hyperliquid-testnet.xyz (built-in)
```

---

## Testing Your Setup

### 1. Check Network Connection

```javascript
// In browser console with MetaMask installed:
await window.ethereum.request({ method: 'eth_chainId' })
// Should return your current network's chain ID
```

### 2. Check Your Address

```javascript
await window.ethereum.request({ method: 'eth_requestAccounts' })
// Returns your MetaMask address
```

### 3. Check Balance

```javascript
await window.ethereum.request({ 
  method: 'eth_getBalance',
  params: ['YOUR_ADDRESS', 'latest']
})
```

---

## Using with Our App

### 1. Connect MetaMask to Our App

When you visit `http://localhost:3000`:
- Make sure MetaMask is on **Arbitrum Sepolia** (testnet)
- Or **Arbitrum One** (mainnet)
- Click "Connect Wallet"
- Approve connection

### 2. Deploy Agent

- Our app will prompt you to switch networks if needed
- All Safe operations happen on Arbitrum
- Hyperliquid trading happens through our Python service

### 3. Sign Transactions

When deploying/setting up:
- MetaMask will pop up for signatures
- Make sure you're on correct network
- Check transaction details before signing

---

## Network Configuration Files

### Save as metamask-networks.json

```json
{
  "networks": [
    {
      "name": "Arbitrum Sepolia",
      "chainId": "421614",
      "rpcUrl": "https://sepolia-rollup.arbitrum.io/rpc",
      "symbol": "ETH",
      "explorer": "https://sepolia.arbiscan.io",
      "type": "testnet"
    },
    {
      "name": "Arbitrum One",
      "chainId": "42161",
      "rpcUrl": "https://arb1.arbitrum.io/rpc",
      "symbol": "ETH",
      "explorer": "https://arbiscan.io",
      "type": "mainnet"
    }
  ],
  "tokens": {
    "arbitrum-sepolia": {
      "USDC": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    },
    "arbitrum-one": {
      "USDC": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    }
  }
}
```

---

## Important Notes

### Network Usage

**Arbitrum Sepolia/One** (use with MetaMask):
- ✅ Safe wallet deployment
- ✅ Module setup
- ✅ USDC bridging to Hyperliquid
- ✅ All on-chain transactions

**Hyperliquid** (use with their app):
- ✅ Trading perpetuals
- ✅ Vault deposits/withdrawals
- ✅ Checking positions
- ✅ Managed through our Python service

### Security

- ✅ Always verify network before signing
- ✅ Check transaction details
- ✅ Start with testnet
- ✅ Use small amounts to test
- ✅ Keep seed phrase secure
- ⚠️ Never share private keys

---

## Need Help?

**Can't add network:**
- Make sure MetaMask is updated
- Try alternative RPC URLs
- Check internet connection

**Wrong network:**
- Click network dropdown
- Select correct network
- Refresh page

**Can't see transactions:**
- Check correct network is selected
- View on block explorer
- Check transaction hash

**MetaMask not working:**
- Update MetaMask
- Try clearing cache
- Restart browser
- Check MetaMask settings

---

**Now your MetaMask is configured!** 🎉

You can:
1. ✅ Connect to Arbitrum Sepolia (testnet)
2. ✅ Deploy Safe wallets
3. ✅ Bridge USDC to Hyperliquid
4. ✅ Interact with our app
5. ✅ Ready for production on Arbitrum One

Use the HTML file for one-click setup or follow manual steps above.

