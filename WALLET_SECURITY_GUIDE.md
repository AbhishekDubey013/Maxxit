# 🔐 Wallet Security Guide - New Executor Setup

**Date Created**: October 8, 2025  
**Status**: Active Setup Guide

---

## ✅ Your New Secure Wallet

### 📍 Wallet Details:

```
Address:      0xd9F6f864f3F93877a3557EF67f2E50D7066aE189
Private Key:  0x3e3518b681ec492a68ed99ed02583699101e63ca42503866712e5d28da848d82
Mnemonic:     nerve obvious nature problem depart person shoot reason twelve fiction satisfy catalog
```

### ⚠️ SECURITY CRITICAL:
1. **Save these credentials in a password manager** (1Password, Bitwarden, LastPass)
2. **Write down the mnemonic on paper** and store in a safe place
3. **Never share** these with anyone, including "support" teams
4. **Delete** this file after saving credentials securely

---

## 🔄 Setup Steps

### Step 1: Update Your .env File

```bash
# Backup old .env first
cp .env .env.backup.compromised

# Update .env with new private key
```

Your new `.env` should have:
```env
EXECUTOR_PRIVATE_KEY=0x3e3518b681ec492a68ed99ed02583699101e63ca42503866712e5d28da848d82
```

### Step 2: Verify .env is Protected

```bash
# Check .gitignore includes .env
cat .gitignore | grep "\.env"

# Make sure .env is NOT in git
git status .env  # Should say "not tracked"

# Check git history (should be empty)
git log --all --full-history -- .env
```

### Step 3: Fund Your New Wallet

**For Sepolia Testnet:**
- Get free ETH from: https://sepoliafaucet.com/
- Or: https://www.alchemy.com/faucets/ethereum-sepolia
- Recommended amount: 0.5 - 1 ETH for testing

**For Arbitrum Mainnet:**
- Bridge ETH from Ethereum mainnet
- Start with small amount: 0.01 ETH for testing
- Scale up once confirmed working

### Step 4: Update Database References

Check if your executor address is stored in the database:

```bash
# Search for old address in database
npx tsx -e "
import { db } from './server/db';
// Check if old executor address is referenced
console.log('Check database for old address references');
"
```

### Step 5: Update Module Deployment (If Needed)

If your module contract references the executor address:

```bash
# Check current module config
npx tsx scripts/debug-module-config.ts

# If needed, deploy new module with new executor
npx tsx scripts/deploy-new-module.ts
```

---

## 🛡️ Security Best Practices

### ✅ DO:

1. **Use a password manager** for all credentials
2. **Enable 2FA** on all accounts (GitHub, email, hosting)
3. **Keep .env files local only** - never share or commit
4. **Regular backups** of important data (NOT private keys in plain text)
5. **Use hardware wallet** for large amounts (Ledger, Trezor)
6. **Regular security audits** of your codebase
7. **Monitor wallet activity** regularly
8. **Use separate wallets** for different purposes (dev, prod, personal)
9. **Keep minimal funds** in hot wallets (online wallets)
10. **Update dependencies** regularly for security patches

### ❌ DON'T:

1. **Never commit .env** to git repositories
2. **Never share private keys** via email, chat, screenshots
3. **Never enter keys on suspicious websites** (phishing)
4. **Never store keys in plain text** on cloud storage
5. **Never reuse compromised keys** even after "cleaning"
6. **Never trust "recovery services"** asking for upfront payment
7. **Never share keys with "support"** (no legit support asks)
8. **Never store keys on shared computers**
9. **Never take screenshots** of private keys/mnemonics
10. **Never use same key across multiple projects**

---

## 🔍 How to Identify Compromise Attempts

### Red Flags:

1. 🚨 **Unexpected transactions** you didn't authorize
2. 🚨 **Instant draining** when funds deposited (sweeper bot)
3. 🚨 **Suspicious token approvals** to unknown contracts
4. 🚨 **Wallet balance disappearing** overnight
5. 🚨 **Strange DM requests** asking for keys/seed phrases
6. 🚨 **Phishing emails** pretending to be support
7. 🚨 **Fake wallet websites** (check URL carefully)
8. 🚨 **Browser extensions** you don't recognize

### Common Attack Vectors:

1. **Phishing websites** - Fake MetaMask/wallet sites
2. **Malicious browser extensions** - Steal keys from clipboard
3. **Compromised dependencies** - npm packages with malware
4. **Social engineering** - Fake support scams
5. **Clipboard hijackers** - Replace addresses when you copy/paste
6. **Keyloggers** - Record everything you type
7. **Git commits** - Private keys accidentally pushed to GitHub
8. **Shared .env files** - Sent via Slack/Discord/email

---

## 📋 Security Checklist

### Initial Setup:
- [x] New wallet generated
- [ ] Private key saved in password manager
- [ ] Mnemonic written on paper and stored safely
- [ ] .env file updated with new key
- [ ] .env verified in .gitignore
- [ ] Old .env backed up and secured
- [ ] New wallet funded with ETH

### Environment Security:
- [ ] Computer scanned for malware
- [ ] Browser extensions reviewed and cleaned
- [ ] Antivirus software installed and updated
- [ ] Operating system updated
- [ ] Passwords changed to strong unique ones
- [ ] 2FA enabled on critical accounts

### Code Security:
- [ ] No private keys in source code
- [ ] .gitignore includes .env files
- [ ] Git history checked (no leaked keys)
- [ ] Dependencies audited (npm audit)
- [ ] Secrets not in environment variables on hosting

### Operational Security:
- [ ] Separate dev and production wallets
- [ ] Minimal funds in hot wallets
- [ ] Regular balance monitoring
- [ ] Token approvals reviewed monthly
- [ ] Backup recovery plan documented

---

## 🔧 Maintenance Schedule

### Daily:
- Monitor wallet for unexpected transactions
- Check error logs for unusual activity

### Weekly:
- Review recent transactions on block explorer
- Check token approvals at https://revoke.cash/

### Monthly:
- Audit dependencies: `npm audit`
- Update security-critical packages
- Review and rotate API keys
- Backup critical data

### Quarterly:
- Full security audit of codebase
- Review and update access controls
- Test disaster recovery procedures
- Update documentation

---

## 🆘 Emergency Response Plan

### If Wallet Compromised:

1. **STOP** - Don't panic, but act quickly
2. **ISOLATE** - Stop using compromised wallet immediately
3. **ASSESS** - Determine extent of compromise
4. **CONTAIN** - Revoke all token approvals
5. **RECOVER** - Move any remaining funds to safe wallet
6. **INVESTIGATE** - Find how compromise occurred
7. **REMEDIATE** - Fix the security issue
8. **PREVENT** - Implement measures to prevent recurrence

### Emergency Contacts:
- **Report scams**: https://info.etherscan.com/report-address/
- **Report phishing**: https://phishing.io/report
- **Malware help**: r/techsupport on Reddit

---

## 📞 Additional Resources

### Security Tools:
- **Revoke.cash** - Review/revoke token approvals
- **Etherscan** - Monitor transactions
- **Malwarebytes** - Malware detection
- **1Password/Bitwarden** - Password management

### Learning Resources:
- **Ethereum Security Best Practices**: https://consensys.github.io/smart-contract-best-practices/
- **Web3 Security Guide**: https://web3sec.info/
- **Phishing Database**: https://github.com/MetaMask/eth-phishing-detect

---

## 🎓 Lessons Learned from This Incident

1. **Early Detection Saves Money** - Found with only $8.57 lost
2. **Testnet First** - Always test on testnet before mainnet
3. **Security Matters** - One mistake can compromise everything
4. **Monitoring is Critical** - Check wallets regularly
5. **Never Reuse Keys** - Once compromised, always compromised

---

## ✅ Final Verification

Before going live, verify:

```bash
# Check new wallet balance (should be funded)
npx tsx scripts/check-executor-status.ts

# Verify no references to old address
grep -r "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6" . --exclude-dir=node_modules --exclude-dir=.git

# Test with small transaction first
npx tsx scripts/test-new-module-flow.ts
```

---

**⚠️ REMEMBER**: Security is not a one-time setup, it's an ongoing process!

**🗑️ DELETE THIS FILE** after you've saved all credentials securely.


