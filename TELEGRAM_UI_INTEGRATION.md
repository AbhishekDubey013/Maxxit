# Telegram UI Integration Guide

## Components Created ✅

1. **`client/src/components/TelegramConnectModal.tsx`** - Modal for linking Telegram
2. **`client/src/components/TelegramStatus.tsx`** - Shows connection status

## How to Integrate into Dashboard

### Step 1: Add imports to `client/src/pages/Dashboard.tsx`

Add these imports at the top:

```typescript
import TelegramConnectModal from "@/components/TelegramConnectModal";
import TelegramStatus from "@/components/TelegramStatus";
```

### Step 2: Add state for Telegram modal

Add this state near the top of the Dashboard component:

```typescript
const [telegramModalOpen, setTelegramModalOpen] = useState(false);
const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>("");
```

### Step 3: Add Telegram connection handler

Add this function:

```typescript
const handleConnectTelegram = (deploymentId: string) => {
  setSelectedDeploymentId(deploymentId);
  setTelegramModalOpen(true);
};
```

### Step 4: Update deployment interface

Add `telegramLinked` field to deployment type:

```typescript
const deployments = [
  {
    id: "1",
    agentName: "Momentum Trader",
    safeWallet: "0x1234...5678",
    status: "ACTIVE" as const,
    subActive: true,
    trialEndsAt: "2025-10-15",
    telegramLinked: false, // Add this
  },
  // ...
];
```

### Step 5: Add Telegram status to deployment card

In the deployments section (around line 290), add this after the subscription info:

```typescript
<div className="pt-4 border-t border-border">
  <p className="text-sm text-muted-foreground mb-2">Manual Trading</p>
  <TelegramStatus
    isLinked={deployment.telegramLinked}
    onConnect={() => handleConnectTelegram(deployment.id)}
  />
</div>
```

### Step 6: Add modal at the end of the component

Before the closing `</div>` of the main component, add:

```typescript
<TelegramConnectModal
  open={telegramModalOpen}
  onClose={() => setTelegramModalOpen(false)}
  deploymentId={selectedDeploymentId}
/>
```

## Complete Updated Dashboard Section

Here's the complete deployments card section with Telegram integration:

```typescript
{activeTab === "deployments" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {deployments.map((deployment) => (
      <Card key={deployment.id} data-testid={`card-deployment-${deployment.id}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{deployment.agentName}</CardTitle>
            <StatusBadge status={deployment.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Safe Wallet</p>
            <p className="font-mono text-sm" data-testid="text-safe-wallet">
              {deployment.safeWallet}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Subscription</p>
              <p className="text-sm font-medium">
                {deployment.subActive ? "Active" : "Inactive"}
              </p>
            </div>
            {deployment.trialEndsAt && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Trial Ends</p>
                <p className="text-sm font-medium">
                  {new Date(deployment.trialEndsAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          
          {/* NEW: Telegram Integration */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Manual Trading</p>
            <TelegramStatus
              isLinked={deployment.telegramLinked}
              onConnect={() => handleConnectTelegram(deployment.id)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Pause
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}

{/* NEW: Telegram Modal */}
<TelegramConnectModal
  open={telegramModalOpen}
  onClose={() => setTelegramModalOpen(false)}
  deploymentId={selectedDeploymentId}
/>
```

## Fetching Telegram Status from API

To get real Telegram link status, create this API endpoint:

**`pages/api/deployments/[id].ts`**:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;
  
  const deployment = await prisma.agentDeployment.findUnique({
    where: { id },
    include: {
      agent: true,
      telegramUsers: {
        where: { isActive: true }
      }
    }
  });
  
  return res.json({
    ...deployment,
    telegramLinked: deployment.telegramUsers.length > 0
  });
}
```

Then in Dashboard, fetch deployments:

```typescript
useEffect(() => {
  fetch('/api/deployments')
    .then(res => res.json())
    .then(data => setDeployments(data));
}, []);
```

## Visual Preview

When user clicks "Connect Telegram":

```
┌─────────────────────────────────────────┐
│  📱 Connect Telegram                     │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Step 1: Copy Code          1 of 3│   │
│  │                                   │   │
│  │    ┌──────────┐  ┌───┐           │   │
│  │    │ ABC123   │  │📋 │           │   │
│  │    └──────────┘  └───┘           │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Step 2: Open Bot           2 of 3│   │
│  │  [Open @MaxxitBot]               │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Step 3: Link               3 of 3│   │
│  │  /link ABC123                    │   │
│  └──────────────────────────────────┘   │
│                                          │
│  💡 After linking, trade naturally:     │
│     "Buy 10 USDC of WETH"                │
└─────────────────────────────────────────┘
```

After linking, the button changes to:

```
✅ Telegram Connected
```

## Summary

Files created:
1. ✅ `client/src/components/TelegramConnectModal.tsx`
2. ✅ `client/src/components/TelegramStatus.tsx`

Files to update:
1. ⏳ `client/src/pages/Dashboard.tsx` (add imports + state + modal)

That's it! The UI is ready for Telegram integration. 🚀

