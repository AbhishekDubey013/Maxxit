# Ostium Signing Flow Explained

## 🔑 **Answer: 2 Signers, User Signs ONCE**

---

## **Detailed Breakdown:**

### **🔐 SIGNER 1: USER (One-Time)**

**What:** User's Arbitrum wallet (MetaMask/Privy)  
**When:** During initial agent approval  
**How Many Times:** **ONCE** (one-time setup)  
**Transaction:** `setDelegate(agentAddress)`  

#### **Code Flow:**

```typescript
// 1. User clicks "Deploy Ostium Agent"
// 2. OstiumApproval modal opens
// 3. User clicks "Sign Approval Transaction"

// Frontend (OstiumApproval.tsx):
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner(); // USER'S WALLET

const contract = new ethers.Contract(
  OSTIUM_TRADING_CONTRACT,
  ['function setDelegate(address delegate) external'],
  signer // USER signs this
);

// USER SIGNS HERE (MetaMask popup)
const tx = await contract.setDelegate(agentAddress);
await tx.wait();

// ✅ DONE! User never signs again
```

**What This Does:**
- Approves agent to trade on user's behalf
- Recorded on-chain in Ostium smart contract
- User retains full custody of funds
- Can be revoked anytime

---

### **🤖 SIGNER 2: AGENT (Every Trade)**

**What:** Agent's wallet (backend-controlled)  
**When:** Every trade (open/close positions)  
**How Many Times:** **UNLIMITED** (automated)  
**Transaction:** `perform_trade(..., trader_address=user)`  

#### **Code Flow:**

```python
# Backend (ostium-service.py):
# Agent uses its own private key
sdk = OstiumSDK(
    private_key=AGENT_PRIVATE_KEY,  # AGENT'S KEY (not user's)
    use_delegation=True              # Enable delegation mode
)

# AGENT SIGNS TRANSACTION (automated, no user prompt)
result = sdk.ostium.perform_trade(
    trade_params={
        'trader_address': USER_ADDRESS,  # Position goes to USER
        'collateral': 1000,
        'direction': True,  # Long
        'leverage': 3,
    },
    at_price=current_price
)

# ✅ Position opens on USER's Ostium account
# ✅ User was NOT prompted to sign
# ✅ Agent signed on user's behalf (via delegation)
```

**What This Does:**
- Agent signs with its own key
- Uses delegation to trade for user
- Position appears on user's account
- User sees trade automatically
- No user interaction required

---

## **📊 Comparison Table:**

| Aspect | User (Signer 1) | Agent (Signer 2) |
|--------|----------------|------------------|
| **Private Key** | User's (MetaMask) | Agent's (backend) |
| **Signs What** | Approval transaction | Trading transactions |
| **Frequency** | **1 time only** | **Every trade** |
| **User Prompted** | Yes (MetaMask popup) | No (automated) |
| **Gas Cost** | User pays (~$0.50) | Agent pays |
| **Purpose** | Grant permission | Execute trades |
| **Revocable** | Yes (user can revoke) | N/A (agent has permission) |

---

## **🔄 Complete User Journey:**

### **Step 1: Initial Setup (User Signs)**

```
1. User clicks "Deploy Ostium Agent"
2. Backend assigns agent wallet
3. OstiumApproval modal opens
4. User reviews permissions
5. User clicks "Sign Approval Transaction"
6. 🔐 USER SIGNS (MetaMask popup)
7. Transaction confirms on-chain
8. ✅ Agent is now approved
```

**User Action:** Sign ONE transaction  
**Cost:** ~$0.50 gas (testnet)  
**Frequency:** One-time setup  

---

### **Step 2: Automated Trading (Agent Signs)**

```
Tweet detected → Signal generated
   ↓
Backend calls ostium-service.py
   ↓
SDK creates trade parameters
   ↓
🤖 AGENT SIGNS transaction (no user prompt)
   ↓
Transaction sent to Ostium
   ↓
Keeper fills order
   ↓
✅ Position opens on USER's account
   ↓
User sees position in dashboard
```

**User Action:** None (fully automated)  
**Cost:** $0 (agent pays gas)  
**Frequency:** Every trade signal  

---

## **🎯 Key Insights:**

### **User Experience:**

✅ **Simple**: User signs ONCE  
✅ **Fast**: No wallet prompts during trading  
✅ **Secure**: User retains full custody  
✅ **Transparent**: All trades visible on-chain  

### **Security Model:**

✅ **Non-Custodial**: User never shares private key  
✅ **Limited Scope**: Agent can only trade, not withdraw  
✅ **Revocable**: User can remove agent access  
✅ **Auditable**: All actions on-chain  

---

## **💡 Why This Design?**

### **Alternative 1: User Signs Every Trade** ❌
```
Problem: User must approve every single trade
Result: Slow, annoying, not automated
UX: Terrible (MetaMask popup spam)
```

### **Alternative 2: User Gives Backend Their Key** ❌
```
Problem: Backend has full control of funds
Result: Custodial, high risk
Security: Unacceptable
```

### **Our Solution: Delegation** ✅
```
User: Signs ONCE (approval)
Agent: Signs trades (automated)
Result: Fast, secure, non-custodial
UX: Perfect (one-time setup)
Security: Excellent (limited permissions)
```

---

## **📋 Technical Details:**

### **On-Chain Verification:**

```solidity
// Ostium Trading Contract
mapping(address => address) public delegations;

function setDelegate(address delegate) external {
    delegations[msg.sender] = delegate;
    // USER (msg.sender) approves AGENT (delegate)
}

function delegatedAction(address trader, bytes calldata data) external {
    require(delegations[trader] == msg.sender, "Not delegated");
    // AGENT (msg.sender) trades for USER (trader)
}
```

### **Delegation Check:**

```python
# Verify agent is approved
trading_contract = sdk.ostium.ostium_trading_contract
delegate = trading_contract.functions.delegations(user_address).call()

if delegate.lower() == agent_address.lower():
    print("✅ Agent is approved")
else:
    print("❌ Agent not approved - user must sign approval tx")
```

---

## **🚀 Gas Costs:**

| Transaction | Who Signs | Who Pays | Testnet Cost | Mainnet Est. |
|-------------|-----------|----------|--------------|--------------|
| **Approval** | User | User | ~$0.50 | ~$2-5 |
| **Open Position** | Agent | Agent | ~$1 | ~$5-10 |
| **Close Position** | Agent | Agent | ~$1 | ~$5-10 |

**User Total Cost:** ~$0.50 (one-time approval)  
**Agent Total Cost:** $1-2 per trade (paid by platform)  

---

## **🔐 Security FAQs:**

### **Q: Can the agent withdraw my funds?**
**A:** No. Agent can only open/close positions, not transfer funds.

### **Q: What if I want to stop the agent?**
**A:** Call `removeDelegate()` on the Ostium contract. Agent loses access immediately.

### **Q: Does the agent ever have my private key?**
**A:** No. Agent uses its own key and trades via delegation.

### **Q: What if the agent's key is compromised?**
**A:** Agent can open/close positions but cannot withdraw funds. You can revoke access.

### **Q: Is this industry standard?**
**A:** Yes! This is how GMX, dYdX, and other DEXs handle automated trading.

---

## **📝 Summary:**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  TOTAL SIGNERS: 2                                   │
│                                                      │
│  ├─ User:  Signs 1 time (approval)                  │
│  │         Cost: ~$0.50                             │
│  │         Frequency: One-time                      │
│  │                                                  │
│  └─ Agent: Signs every trade (automated)            │
│            Cost: $0 for user (agent pays)           │
│            Frequency: Unlimited                     │
│                                                      │
│  USER EXPERIENCE: Sign once, trade forever! ✨      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2025-11-09  
**Status:** ✅ Production Ready  
**Model:** Non-custodial delegation (industry standard)

