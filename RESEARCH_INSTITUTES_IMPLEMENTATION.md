# Research Institutes Implementation Plan

## ✅ Completed (Part 1)

### 1. APR Bug Fixed
- **Issue**: Rise (Ostium) agent showed 3.21% APR with zero positions
- **Fix**: Reset APR to 0% (was stale data)
- **Verification**: APR now correctly shows 0% for agents with no closed positions

### 2. Database Schema Created

Three new tables added:

**`research_institutes`**
```prisma
- id (UUID)
- name (unique)
- description
- logo_url
- website_url
- x_handle (Twitter/X username)
- is_active (boolean)
- created_at
```

**`research_signals`**
```prisma
- id (UUID)
- institute_id (FK to research_institutes)
- signal_text (raw signal from research institute)
- source_url (link to original signal)
- extracted_token (parsed by LLM)
- extracted_side (LONG/SHORT, parsed by LLM)
- extracted_leverage (1-10x, parsed by LLM)
- is_valid_signal (LLM validation result)
- processed_for_trades (flag for signal generator)
- created_at
```

**`agent_research_institutes`**
```prisma
- id (UUID)
- agent_id (FK to agents)
- institute_id (FK to research_institutes)
- created_at
- UNIQUE constraint on (agent_id, institute_id)
```

**Relationships**:
- Agents ↔ Research Institutes (many-to-many via junction table)
- Research Institutes → Research Signals (one-to-many)

---

## 🚧 TODO (Part 2 - Backend)

### 1. Create Research Institute Management API

**Endpoints needed**:

```typescript
// Admin endpoints
POST   /api/admin/research-institutes         // Create new institute
GET    /api/admin/research-institutes         // List all
PUT    /api/admin/research-institutes/:id     // Update
DELETE /api/admin/research-institutes/:id     // Delete/deactivate

// Public endpoints  
GET    /api/research-institutes                // List active institutes
GET    /api/research-institutes/:id            // Get details

// Agent endpoints
POST   /api/agents/:id/research-institutes     // Link institute to agent
DELETE /api/agents/:id/research-institutes/:instituteId  // Unlink
GET    /api/agents/:id/research-institutes     // Get agent's institutes
```

### 2. Create Signal Ingestion System

**File**: `lib/research-signal-parser.ts`

```typescript
interface ResearchSignalInput {
  instituteId: string;
  signalText: string;
  sourceUrl?: string;
}

interface ParsedSignal {
  token: string;
  side: 'LONG' | 'SHORT';
  leverage: number;  // 1-10
  isValid: boolean;
  reasoning?: string;
}

async function parseResearchSignal(input: ResearchSignalInput): Promise<ParsedSignal> {
  // Use OpenAI/Anthropic to parse signal text
  // Extract token, long/short, leverage
  // Validate format and feasibility
  // Return structured data
}
```

**LLM Prompt Template**:
```
You are a trading signal parser. Extract structured data from this research signal.

Signal Text: "{signalText}"
Institute: "{instituteName}"

Extract and return JSON:
{
  "token": "BTC",           // Token symbol
  "side": "LONG",           // LONG or SHORT
  "leverage": 3,            // 1-10x
  "confidence": "HIGH",     // HIGH/MEDIUM/LOW
  "reasoning": "Clear buy signal with target and stop loss"
}

Rules:
- Only valid if token, side, and leverage are present
- Leverage defaults to 1x if not specified
- Reject vague signals
```

### 3. Create Signal Generator Worker

**File**: `workers/research-signal-generator.ts`

```typescript
async function processResearchSignals() {
  // 1. Get unprocessed research signals
  const signals = await prisma.research_signals.findMany({
    where: {
      processed_for_trades: false,
      is_valid_signal: true
    },
    include: {
      research_institutes: {
        include: {
          agent_research_institutes: {
            include: { agents: true }
          }
        }
      }
    }
  });

  // 2. For each valid signal:
  for (const signal of signals) {
    // 3. Find all agents following this institute
    const agents = signal.research_institutes.agent_research_institutes.map(
      ari => ari.agents
    );

    // 4. Create trading signals with FIXED 5% position size
    for (const agent of agents) {
      await prisma.signals.create({
        data: {
          agent_id: agent.id,
          venue: agent.venue,
          token_symbol: signal.extracted_token,
          side: signal.extracted_side,
          size_model: {
            type: 'balance-percentage',
            value: 5  // FIXED 5% per trade
          },
          risk_model: {
            stopLoss: 0.05,      // 5% stop loss
            takeProfit: 0.15,    // 15% take profit
            leverage: signal.extracted_leverage
          },
          source_tweets: [`RESEARCH_${signal.id}`]
        }
      });
    }

    // 5. Mark as processed
    await prisma.research_signals.update({
      where: { id: signal.id },
      data: { processed_for_trades: true }
    });
  }
}
```

---

## 🚧 TODO (Part 3 - UI)

### 1. Update Agent Creation Flow

**Remove**: Weight selection UI (currently uses `impact_factor` weights)

**Add**: Research Institute Selection

**File**: `pages/create-agent.tsx` or `client/src/pages/CreateAgent.tsx`

```typescript
// Replace weight sliders with:
<ResearchInstituteSelector
  selectedInstitutes={selectedInstitutes}
  onChange={setSelectedInstitutes}
  venue={agent.venue}  // Filter institutes by venue if needed
/>
```

### 2. Create Research Institute Selector Component

**File**: `components/ResearchInstituteSelector.tsx`

```typescript
interface ResearchInstitute {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  x_handle: string;
}

function ResearchInstituteSelector({
  selectedInstitutes,
  onChange,
  venue
}: Props) {
  const [institutes, setInstitutes] = useState<ResearchInstitute[]>([]);

  // Fetch available institutes
  useEffect(() => {
    fetch('/api/research-institutes')
      .then(res => res.json())
      .then(data => setInstitutes(data));
  }, []);

  return (
    <div className="research-institute-selector">
      <h3>Select Research Institutes</h3>
      <p>Choose which research providers' signals this agent will follow</p>
      
      <div className="institutes-grid">
        {institutes.map(institute => (
          <InstituteCard
            key={institute.id}
            institute={institute}
            selected={selectedInstitutes.includes(institute.id)}
            onToggle={() => {
              if (selectedInstitutes.includes(institute.id)) {
                onChange(selectedInstitutes.filter(id => id !== institute.id));
              } else {
                onChange([...selectedInstitutes, institute.id]);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InstituteCard({ institute, selected, onToggle }: CardProps) {
  return (
    <div 
      className={`institute-card ${selected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      <img src={institute.logo_url} alt={institute.name} />
      <h4>{institute.name}</h4>
      <p>{institute.description}</p>
      {institute.x_handle && (
        <a href={`https://x.com/${institute.x_handle}`} target="_blank">
          @{institute.x_handle}
        </a>
      )}
      {selected && <CheckIcon />}
    </div>
  );
}
```

### 3. Update Agent Details Page

Show which research institutes the agent follows:

```typescript
<section>
  <h3>Following Research Institutes</h3>
  <div className="institutes-list">
    {agent.agent_research_institutes.map(ari => (
      <InstituteBadge key={ari.id} institute={ari.research_institutes} />
    ))}
  </div>
</section>
```

---

## 🧪 Testing Plan

### 1. Database Testing
```bash
# Create test institutes
npm run tsx scripts/seed-research-institutes.ts

# Verify schema
npx prisma studio
```

### 2. API Testing
```bash
# Create institute
curl -X POST http://localhost:5000/api/admin/research-institutes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Crypto Insights Pro",
    "description": "Professional crypto trading signals",
    "x_handle": "cryptoinsights"
  }'

# Link to agent
curl -X POST http://localhost:5000/api/agents/{agentId}/research-institutes \
  -H "Content-Type: application/json" \
  -d '{"instituteId": "{instituteId}"}'
```

### 3. Signal Testing
```bash
# Ingest test signal
npm run tsx scripts/test-research-signal.ts

# Run signal parser
npm run tsx workers/research-signal-generator.ts

# Verify signal created
psql $DATABASE_URL -c "SELECT * FROM signals WHERE source_tweets LIKE 'RESEARCH_%' LIMIT 5"
```

---

## 📊 Migration Path

### Phase 1: Parallel Operation (Recommended)
- Keep both systems running (weights + research institutes)
- Let users choose which one to use
- Monitor adoption

### Phase 2: Deprecation
- Hide weights UI for new agents
- Show deprecation notice for existing weight-based agents
- Provide migration tool

### Phase 3: Removal
- Remove weights column from schema
- Remove impact_factor logic
- Fully migrate to research institutes

---

## 🎯 Key Benefits

1. **No Manual Weight Tuning**: Users just pick trusted research providers
2. **Fixed 5% Position Size**: Simpler, more predictable
3. **Centralized Signal Quality**: Research institutes are vetted
4. **Scalable**: Easy to add new research providers
5. **Transparent**: Users see exactly which signals their agent follows

---

## 📝 Example User Flow

### Before (Weights System):
```
1. User creates agent
2. User selects X accounts to follow
3. User manually sets weight for each account (0-100)
4. System uses weights to determine position size
5. Complex, confusing, hard to tune
```

### After (Research Institutes):
```
1. User creates agent
2. User selects research institutes (e.g., "Crypto Insights Pro")
3. System automatically:
   - Parses institute's signals via LLM
   - Extracts token, long/short, leverage
   - Uses fixed 5% position size
   - Creates positions
4. Simple, clear, professional
```

---

## 🚀 Next Steps

To continue implementation, run:

```bash
# Create API endpoints
npm run tsx scripts/create-research-api.ts

# Create LLM parser
npm run tsx scripts/create-signal-parser.ts

# Update UI
cd client && npm run dev

# Test end-to-end
npm run test:research-institutes
```

---

**Status**: Part 1 Complete ✅ (Database Schema)
**Next**: Part 2 (Backend APIs + LLM Parser)
**ETA**: ~2-3 hours of development time

