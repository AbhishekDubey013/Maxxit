# Hyperliquid Integration - Environment Variables

## Required Environment Variables

### 1. ⚠️ CRITICAL: Encryption Key (REQUIRED)

**Purpose**: AES-256-GCM encryption for agent wallet private keys

```bash
# Add ONE of these to your .env file:
AGENT_WALLET_ENCRYPTION_KEY=<64-char-hex-string>
# OR
AGENT_ENCRYPTION_KEY=<64-char-hex-string>
```

**Requirements**:
- MUST be a 64-character hexadecimal string (32 bytes)
- MUST be kept secret and secure
- ⚠️ **NEVER commit to git**
- ⚠️ **Loss of this key = cannot decrypt existing agent wallets**

**Generate a secure key**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Example** (DO NOT USE IN PRODUCTION):
```bash
AGENT_WALLET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

### 2. Hyperliquid Service URL

**Purpose**: URL of the Python Hyperliquid service

```bash
HYPERLIQUID_SERVICE_URL=http://localhost:5001
```

**Options**:
- **Local Development**: `http://localhost:5001`
- **Docker**: `http://hyperliquid-service:5001`
- **Production**: Your deployed service URL (e.g., `https://hl-service.yourdomain.com`)

**Default**: `http://localhost:5001` (if not set)

---

### 3. Testnet/Mainnet Toggle

**Purpose**: Toggle between Hyperliquid testnet and mainnet

```bash
HYPERLIQUID_TESTNET=true
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true
```

**Options**:
- `true` = Testnet (for testing)
- `false` = Mainnet (for production)

**Important**:
- ⚠️ Python service must have the same setting!
- Create a `.env` file in `services/` directory with:
  ```bash
  HYPERLIQUID_TESTNET=true
  ```

---

### 4. Hyperliquid Service Port (Optional)

**Purpose**: Port for Python service to listen on

```bash
HYPERLIQUID_SERVICE_PORT=5001
```

**Default**: `5001` (if not set)

---

### 5. Shared Agent Wallet (Optional - Fallback Only)

**Purpose**: Fallback agent wallet if deployment doesn't have unique agent

```bash
HYPERLIQUID_AGENT_PRIVATE_KEY=0x...
HYPERLIQUID_AGENT_ADDRESS=0x...
NEXT_PUBLIC_HYPERLIQUID_AGENT_ADDRESS=0x...
```

**Note**: With the new per-deployment architecture, these are only used as fallback. All deployments should have unique agents.

---

### 6. Test Agent (Optional - Testing Only)

**Purpose**: For running test scripts

```bash
HYPERLIQUID_TEST_AGENT_KEY=0x...
NEXT_PUBLIC_HYPERLIQUID_TEST_AGENT_KEY=0x...
```

**Note**: Only needed for development and testing. Not required in production.

---

## Complete .env Example

```bash
# ============================================================================
# HYPERLIQUID INTEGRATION
# ============================================================================

# 1. ENCRYPTION KEY (CRITICAL - CHANGE IN PRODUCTION!)
AGENT_WALLET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# 2. HYPERLIQUID SERVICE
HYPERLIQUID_SERVICE_URL=http://localhost:5001
HYPERLIQUID_SERVICE_PORT=5001

# 3. TESTNET/MAINNET
HYPERLIQUID_TESTNET=true
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true

# 4. FALLBACK AGENT (Optional)
HYPERLIQUID_AGENT_PRIVATE_KEY=0x990da0bd0112dfd85c2cfd54537cd5c8b0d54f8ef6e36c489a551826b67ffd63
HYPERLIQUID_AGENT_ADDRESS=0x0b91B5d2eB90ec3baAbd1347fF6bd69780F9E689
NEXT_PUBLIC_HYPERLIQUID_AGENT_ADDRESS=0x0b91B5d2eB90ec3baAbd1347fF6bd69780F9E689

# 5. TEST AGENT (Optional - Testing Only)
HYPERLIQUID_TEST_AGENT_KEY=0x990da0bd0112dfd85c2cfd54537cd5c8b0d54f8ef6e36c489a551826b67ffd63
NEXT_PUBLIC_HYPERLIQUID_TEST_AGENT_KEY=0x990da0bd0112dfd85c2cfd54537cd5c8b0d54f8ef6e36c489a551826b67ffd63
```

---

## Python Service .env

Create a separate `.env` file in the `services/` directory:

```bash
# services/.env
HYPERLIQUID_TESTNET=true
```

---

## Production Checklist

Before deploying to production:

- [ ] **Generate secure encryption key** (never use default!)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Set testnet to false**
  ```bash
  HYPERLIQUID_TESTNET=false
  NEXT_PUBLIC_HYPERLIQUID_TESTNET=false
  ```

- [ ] **Update service URL** to production endpoint
  ```bash
  HYPERLIQUID_SERVICE_URL=https://hl-service.yourdomain.com
  ```

- [ ] **Backup encryption key securely**
  - Store in password manager
  - Store in secure secrets manager (AWS Secrets Manager, etc.)
  - ⚠️ **Cannot recover without it!**

- [ ] **Update Python service .env**
  ```bash
  # services/.env
  HYPERLIQUID_TESTNET=false
  ```

- [ ] **Remove test keys** (not needed in production)

- [ ] **Verify firewall rules** (port 5001 or custom port)

- [ ] **Set up monitoring** for Python service health

---

## Quick Setup for Development

### Step 1: Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Add to .env
```bash
echo "AGENT_WALLET_ENCRYPTION_KEY=<generated-key>" >> .env
echo "HYPERLIQUID_SERVICE_URL=http://localhost:5001" >> .env
echo "HYPERLIQUID_TESTNET=true" >> .env
echo "NEXT_PUBLIC_HYPERLIQUID_TESTNET=true" >> .env
```

### Step 3: Create services/.env
```bash
echo "HYPERLIQUID_TESTNET=true" > services/.env
```

### Step 4: Restart services
```bash
# Restart Next.js
npm run dev

# Restart Python service
cd services
python3 hyperliquid-service.py
```

---

## Environment Variable Naming

The code checks for multiple naming patterns for backward compatibility:

| Variable | Alternative Names | Priority |
|----------|-------------------|----------|
| Encryption Key | `AGENT_WALLET_ENCRYPTION_KEY` | 1st |
|  | `AGENT_ENCRYPTION_KEY` | 2nd |
| Testnet Toggle | `HYPERLIQUID_TESTNET` | - |
| Service URL | `HYPERLIQUID_SERVICE_URL` | - |

---

## Troubleshooting

### Error: "Decryption failed"
- **Cause**: Wrong or missing `AGENT_WALLET_ENCRYPTION_KEY`
- **Solution**: Ensure key matches what was used for encryption

### Error: "Hyperliquid service not responding"
- **Cause**: Python service not running or wrong URL
- **Solution**: Check `HYPERLIQUID_SERVICE_URL` and start Python service

### Error: "Agent not approved"
- **Cause**: User hasn't approved agent on Hyperliquid UI
- **Solution**: User must visit Hyperliquid and approve agent address

### Positions not executing
- **Check**: `HYPERLIQUID_TESTNET` matches between Next.js and Python service
- **Check**: Agent has unique `hyperliquid_agent_address` in deployment
- **Check**: Deployment is ACTIVE

---

## Security Best Practices

1. **Never commit** `.env` files to git
2. **Use different encryption keys** for dev/staging/prod
3. **Rotate encryption keys** periodically (requires re-encrypting all agents)
4. **Use secrets manager** in production (AWS Secrets Manager, HashiCorp Vault, etc.)
5. **Restrict access** to encryption key (need-to-know basis)
6. **Backup encryption key** in multiple secure locations
7. **Use HTTPS** for `HYPERLIQUID_SERVICE_URL` in production

---

## Migration from Shared to Per-Deployment Agents

If you have existing deployments using the old shared agent model:

1. The fallback `HYPERLIQUID_AGENT_PRIVATE_KEY` will be used
2. To migrate to unique agents:
   - User opens deployment in UI
   - Clicks "Setup Hyperliquid Agent"
   - System generates new unique agent
   - User approves new agent on Hyperliquid
   - New trades use unique agent

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0

