# Ostium Position Synchronization Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     OSTIUM POSITION SYNC SYSTEM                      │
│                   (Defense-in-Depth Architecture)                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   Ostium Blockchain │ ◄─── Source of Truth
│   (Arbitrum Sepolia)│
└─────────┬───────────┘
          │
          │ Monitors
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          LAYER 1: MONITOR                            │
│                    (Background Synchronization)                      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Position Monitor Worker (runs every 30s)                      │  │
│  │                                                                │  │
│  │ 1. Fetch on-chain positions                                   │  │
│  │ 2. Compare with DB                                            │  │
│  │ 3. Mark missing positions as CLOSED                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │ Syncs
                                ▼
                    ┌────────────────────┐
                    │   PostgreSQL DB    │
                    │   positions table  │
                    │  (status = OPEN)   │
                    └────────┬───────────┘
                             │
                             │ Query
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: PRE-FLIGHT CHECK                        │
│                    (Before Close Operation)                          │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Trade Executor (closeOstiumPositionMethod)                    │  │
│  │                                                                │  │
│  │ 1. Get position from DB                                       │  │
│  │ 2. Fetch on-chain positions for user                          │  │
│  │ 3. Check if position exists on-chain                          │  │
│  │                                                                │  │
│  │    ┌─────────────────────────────────────────────────┐       │  │
│  │    │ If NOT found on-chain:                          │       │  │
│  │    │  • Update DB: status = 'CLOSED'                 │       │  │
│  │    │  • Return success (idempotent)                  │       │  │
│  │    │  • Skip close operation ✅                       │       │  │
│  │    └─────────────────────────────────────────────────┘       │  │
│  │                                                                │  │
│  │    ┌─────────────────────────────────────────────────┐       │  │
│  │    │ If found on-chain:                              │       │  │
│  │    │  • Proceed to close via SDK ➡️                   │       │  │
│  │    └─────────────────────────────────────────────────┘       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ If position exists
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: ERROR RECOVERY                           │
│                   (SDK Error Handling)                               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Ostium Service (Python)                                       │  │
│  │                                                                │  │
│  │ 1. Call SDK: close_trade()                                    │  │
│  │ 2. Catch exception                                            │  │
│  │ 3. Check for error code: 0xf77a8069                           │  │
│  │                                                                │  │
│  │    ┌─────────────────────────────────────────────────┐       │  │
│  │    │ If 0xf77a8069 detected:                         │       │  │
│  │    │  • This is "NoOpenPosition" error               │       │  │
│  │    │  • Return success: true ✅                       │       │  │
│  │    │  • Set alreadyClosed: true                      │       │  │
│  │    └─────────────────────────────────────────────────┘       │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │  Update Database   │
                    │  status = CLOSED   │
                    └────────────────────┘
```

## Sequence Diagram: Close Position Flow

### Scenario 1: Position Exists (Happy Path)
```
User/System          Trade Executor       Ostium Service      Blockchain        Database
    |                      |                     |                  |               |
    |---Close Position---->|                     |                  |               |
    |                      |                     |                  |               |
    |                      |--Get Positions----->|                  |               |
    |                      |                     |--Query---------->|               |
    |                      |                     |<--Positions------|               |
    |                      |<--Positions---------|                  |               |
    |                      |                     |                  |               |
    |                      | ✅ Position Found   |                  |               |
    |                      |                     |                  |               |
    |                      |--Close Position---->|                  |               |
    |                      |                     |--Close Tx------->|               |
    |                      |                     |<--Receipt--------|               |
    |                      |<--Success-----------|                  |               |
    |                      |                     |                  |               |
    |                      |--Update Status=CLOSED------------------>|               |
    |                      |                     |                  |               |
    |<--Success------------|                     |                  |               |
```

### Scenario 2: Position Already Closed (Pre-Flight Catch)
```
User/System          Trade Executor       Ostium Service      Blockchain        Database
    |                      |                     |                  |               |
    |---Close Position---->|                     |                  |               |
    |                      |                     |                  |               |
    |                      |--Get Positions----->|                  |               |
    |                      |                     |--Query---------->|               |
    |                      |                     |<--Empty----------|               |
    |                      |<--Empty-------------|                  |               |
    |                      |                     |                  |               |
    |                      | ❌ Position NOT Found                  |               |
    |                      |                     |                  |               |
    |                      |--Update Status=CLOSED (CLOSED_EXTERNALLY)------------->|
    |                      |                     |                  |               |
    |<--Success (Idempotent)                    |                  |               |
    |                      |  ⏭️ Skip Close      |                  |               |
```

### Scenario 3: Race Condition (SDK Error Catch)
```
User/System          Trade Executor       Ostium Service      Blockchain        Database
    |                      |                     |                  |               |
    |---Close Position---->|                     |                  |               |
    |                      |                     |                  |               |
    |                      |--Get Positions----->|                  |               |
    |                      |                     |--Query---------->|               |
    |                      |                     |<--Positions------|               |
    |                      |<--Positions---------|                  |               |
    |                      |                     |                  |               |
    |                      | ✅ Position Found   |                  |               |
    |                      |                     |                  |               |
    |                      |         🕐 Position closes externally  |               |
    |                      |                     |                  |               |
    |                      |--Close Position---->|                  |               |
    |                      |                     |--Close Tx------->|               |
    |                      |                     |<--0xf77a8069-----|  ❌ Error     |
    |                      |                     |                  |               |
    |                      |                     | 🛡️ Catch Error   |               |
    |                      |                     | Return success   |               |
    |                      |<--Success (alreadyClosed: true)--------|               |
    |                      |                     |                  |               |
    |                      |--Update Status=CLOSED (CLOSED_EXTERNALLY)------------->|
    |                      |                     |                  |               |
    |<--Success (Idempotent)                    |                  |               |
```

## Error Code Reference

```
┌─────────────────────────────────────────────────────────────┐
│ Error Code: 0xf77a8069                                      │
├─────────────────────────────────────────────────────────────┤
│ Meaning: NoOpenPosition / PositionAlreadyClosed             │
│                                                              │
│ Causes:                                                      │
│  • Position was closed manually                             │
│  • Position was liquidated                                  │
│  • Position hit stop-loss externally                        │
│  • Race condition (closed between check and close)          │
│                                                              │
│ Handling:                                                    │
│  ✅ Treat as SUCCESS (idempotent operation)                 │
│  ✅ Update DB status to CLOSED                              │
│  ✅ Return success to caller                                │
│  ❌ Do NOT throw error or retry                             │
└─────────────────────────────────────────────────────────────┘
```

## Database State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                    Position Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

          CREATE POSITION
               │
               ▼
        ┌─────────────┐
        │ status=OPEN │ ◄───────────────┐
        │ closed_at=  │                 │
        │   null      │                 │ Reopen if found
        └──────┬──────┘                 │ on-chain again
               │                         │
               │ Close Signal            │
               ▼                         │
         ╔═══════════╗                  │
         ║ Pre-Flight║                  │
         ║   Check   ║                  │
         ╚═════╤═════╝                  │
               │                         │
     ┌─────────┴─────────┐              │
     │                   │              │
  ✅ Exists          ❌ Missing        │
     │                   │              │
     ▼                   ▼              │
 Close via SDK    Update DB Only       │
     │                   │              │
     └─────────┬─────────┘              │
               ▼                         │
        ┌──────────────┐                │
        │status=CLOSED │                │
        │closed_at=now │                │
        │exit_reason=* │                │
        └──────────────┘                │
               │                         │
               │ If reopened on-chain   │
               └─────────────────────────┘
```

## Summary: Triple Protection

```
╔════════════════════════════════════════════════════════════╗
║                    PROTECTION LAYERS                        ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  🛡️ Layer 1: Monitor (Background)                          ║
║     Runs: Every 30 seconds                                 ║
║     Catches: Positions closed 30+ seconds ago              ║
║                                                             ║
║  🛡️ Layer 2: Pre-Flight Check (Real-time)                  ║
║     Runs: Before every close operation                     ║
║     Catches: Recently closed positions                     ║
║                                                             ║
║  🛡️ Layer 3: Error Recovery (Last Resort)                  ║
║     Runs: On SDK error                                     ║
║     Catches: Race conditions (closed during close)         ║
║                                                             ║
║  ✅ Result: 100% idempotent close operations               ║
║  ✅ Result: Zero `0xf77a8069` errors surfaced to users     ║
║  ✅ Result: Database always in sync with blockchain        ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

