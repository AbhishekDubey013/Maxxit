# V3 Deployment Checklist

## ✅ Completed

### Database
- [x] Created `agents_v3` table
- [x] Created `agent_deployments_v3` table
- [x] Created `signals_v3` table
- [x] Created `positions_v3` table
- [x] Created `venue_routing_config_v3` table
- [x] Created `venue_routing_history_v3` table
- [x] Created `venue_v3_t` enum (MULTI, HYPERLIQUID, OSTIUM, GMX, SPOT)
- [x] Set global default routing config (HYPERLIQUID → OSTIUM)
- [x] Verified V2 data untouched (10 agents, 628 signals, 181 positions)
- [x] Confirmed market data available (220 HL + 41 Ostium pairs)

### Backend Services
- [x] Created `lib/v3/venue-router.ts` (Agent Where)
- [x] Created `lib/v3/signal-generator-v3.ts` (Agent What)
- [x] Created `lib/v3/trade-executor-v3.ts` (execution with routing)
- [x] Implemented intelligent venue selection logic
- [x] Implemented routing history logging
- [x] Implemented market availability checks

### API Endpoints
- [x] `/api/v3/agents/create` - Create venue-agnostic agents
- [x] `/api/v3/agents/list` - List V3 agents
- [x] `/api/v3/agents/deploy` - Deploy agents to user wallets
- [x] `/api/v3/signals/generate` - Generate signals (MULTI venue)
- [x] `/api/v3/execute/trade` - Execute with auto-routing
- [x] `/api/v3/stats/overview` - System statistics
- [x] `/api/v3/stats/routing-history` - Routing analytics

### Workers
- [x] Created `workers/v3-signal-worker.ts`
- [x] Created `scripts/start-v3-workers.sh`
- [x] Created `scripts/stop-v3-workers.sh`
- [x] Implemented automatic signal generation
- [x] Implemented automatic trade execution

### Scripts & Tools
- [x] Created `scripts/exec-v3-sql-fixed.ts` (database setup)
- [x] Created `scripts/verify-v3-system.ts` (verification)
- [x] Created `scripts/deploy-v3-separate.ts` (deployment)

### Documentation
- [x] Created `V3_SEPARATE_SYSTEM.md` (overview)
- [x] Created `V3_COMPLETE_GUIDE.md` (comprehensive guide)
- [x] Created `V3_DEPLOYMENT_CHECKLIST.md` (this file)
- [x] Created `prisma/schema-v3.prisma` (reference schema)

## 🔲 To Do (User Actions)

### Setup & Testing
- [x] Run database setup: `npx tsx scripts/exec-v3-sql-fixed.ts`
- [x] Verify all tables: `npx tsx scripts/check-all-v3-tables.ts`
- [x] Check homepage loads correctly (shows "No V3 agents yet")
- [ ] Create first V3 agent via API
- [ ] Deploy agent to test wallet
- [ ] Generate test signal
- [ ] Execute test trade
- [ ] Verify routing history
- [ ] Check position created

### Production Deployment
- [ ] Start V3 workers: `./scripts/start-v3-workers.sh`
- [ ] Monitor worker logs: `tail -f logs/v3-signal-worker.log`
- [ ] Set up X account monitoring (add real account IDs)
- [ ] Configure research institutes
- [ ] Test with small position sizes first
- [ ] Gradually increase to production sizes

### Optional Enhancements
- [ ] Implement Agent How policies
- [ ] Add more venues (GMX, SPOT)
- [ ] Implement advanced routing strategies (liquidity, fees)
- [ ] Add frontend UI for V3 agents
- [ ] Set up monitoring dashboards
- [ ] Configure alerting for failed trades

## 🎯 Current Status

**Database**: ✅ Ready
- V3 tables: 6/6 created
- Enum: venue_v3_t created
- Global config: Set
- Market data: 261 pairs available

**API**: ✅ Ready
- Endpoints: 7/7 implemented
- Services: 3/3 implemented
- Workers: 1/1 implemented

**V2 Isolation**: ✅ Confirmed
- V2 agents: 10 (untouched)
- V2 signals: 628 (preserved)
- V2 positions: 181 (intact)
- V3 agents: 0 (fresh start)

## 🚀 Next Immediate Steps

1. **Verify Setup**
   ```bash
   npx tsx scripts/verify-v3-system.ts
   ```

2. **Create First Agent**
   ```bash
   curl -X POST http://localhost:3000/api/v3/agents/create \
     -H "Content-Type: application/json" \
     -d '{
       "creator_wallet": "0xYourWallet",
       "name": "Test V3 Agent",
       "x_account_ids": ["123456"],
       "research_institute_ids": [],
       "weights": {"x": 1.0, "research": 0},
       "profit_receiver_address": "0xYourWallet"
     }'
   ```

3. **Start Workers**
   ```bash
   ./scripts/start-v3-workers.sh
   ```

4. **Monitor Logs**
   ```bash
   tail -f logs/v3-signal-worker.log
   ```

## 📊 Success Criteria

### Database Health
- ✅ All 6 V3 tables exist
- ✅ venue_v3_t enum has 5 values
- ✅ Global routing config exists
- ✅ V2 tables unchanged

### Functional Tests
- [ ] Agent creation succeeds
- [ ] Agent deployment succeeds
- [ ] Signal generation works
- [ ] Venue routing selects correct venue
- [ ] Trade execution succeeds
- [ ] Routing history logs correctly

### Performance Targets
- [ ] Routing decision < 100ms
- [ ] Signal generation < 2s
- [ ] Trade execution < 5s
- [ ] Worker cycle < 30s

## 🛟 Troubleshooting

### Issue: "Agent not found"
**Solution**: Ensure you're using V3 agent ID, not V2 agent ID

### Issue: "No venue available"
**Solution**: Check market data with:
```sql
SELECT * FROM venue_markets WHERE symbol = 'YOUR_TOKEN';
```

### Issue: "Routing failed"
**Solution**: Check venue_routing_config_v3:
```sql
SELECT * FROM venue_routing_config_v3 WHERE agent_id IS NULL;
```

### Issue: "Worker not starting"
**Solution**: 
```bash
# Check if already running
ps aux | grep v3-signal-worker

# Stop existing
./scripts/stop-v3-workers.sh

# Start fresh
./scripts/start-v3-workers.sh
```

## 📞 Support

For issues or questions:
1. Check logs: `logs/v3-signal-worker.log`
2. Verify setup: `npx tsx scripts/verify-v3-system.ts`
3. Check database: Query V3 tables directly
4. Review documentation: `V3_COMPLETE_GUIDE.md`

---

**V3 is ready to use! 🎉**

