import { useEffect, useState } from 'react';
import { Header } from '@components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Activity, 
  MessageCircle, 
  CheckCircle,
  TrendingUp,
  Settings,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Deployment {
  id: string;
  agentId: string;
  agent: {
    name: string;
    venue: string;
  };
  userWallet: string;
  safeWallet: string;
  moduleEnabled: boolean;
  status: string;
  telegramLinked?: boolean;
}

export default function MyDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');
  const [linkCode, setLinkCode] = useState<string>('');
  const [botUsername, setBotUsername] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/deployments');
      const data = await response.json();
      setDeployments(data);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTelegram = async (deploymentId: string) => {
    setSelectedDeploymentId(deploymentId);
    setTelegramModalOpen(true);
    setLinkCode('');
    setBotUsername('');
  };

  const generateLinkCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId: selectedDeploymentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate link code');
      }

      const data = await response.json();
      setLinkCode(data.linkCode);
      setBotUsername(data.botUsername);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(linkCode);
    alert('Code copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Deployments</h1>
          <p className="text-muted-foreground">
            Manage your agent subscriptions and connect Telegram for manual trading
          </p>
        </div>

        {deployments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No deployments yet</h3>
              <p className="text-muted-foreground mb-4">
                Deploy an agent to start automated trading
              </p>
              <Button asChild>
                <a href="/">Browse Agents</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deployments.map((deployment) => (
              <Card key={deployment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{deployment.agent.name}</CardTitle>
                    <Badge variant={deployment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {deployment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {deployment.agent.venue}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Safe Wallet */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Wallet className="w-4 h-4" />
                      Safe Wallet
                    </div>
                    <p className="font-mono text-sm">
                      {deployment.safeWallet.slice(0, 6)}...{deployment.safeWallet.slice(-4)}
                    </p>
                  </div>

                  {/* Module Status */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Activity className="w-4 h-4" />
                      Module Status
                    </div>
                    <div className="flex items-center gap-2">
                      {deployment.moduleEnabled ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Enabled</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">Not enabled</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Telegram Connection */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MessageCircle className="w-4 h-4" />
                      Manual Trading
                    </div>
                    {deployment.telegramLinked ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Telegram Connected</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnectTelegram(deployment.id)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Connect Telegram
                      </Button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`/agent/${deployment.agentId}`}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        View Agent
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Telegram Connect Modal */}
      <Dialog open={telegramModalOpen} onOpenChange={setTelegramModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Connect Telegram
            </DialogTitle>
            <DialogDescription>
              Link your Safe wallet to Telegram for manual trading
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!linkCode && (
              <Button 
                onClick={generateLinkCode} 
                className="w-full" 
                size="lg"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Generate Link Code
                  </>
                )}
              </Button>
            )}

            {linkCode && (
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Step 1: Copy Code</span>
                    <Badge>1 of 3</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-4 py-3 rounded text-2xl font-mono text-center">
                      {linkCode}
                    </code>
                    <Button onClick={copyCode} variant="outline" size="icon">
                      📋
                    </Button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Step 2: Open Bot</span>
                    <Badge>2 of 3</Badge>
                  </div>
                  <Button
                    onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
                    className="w-full"
                    variant="outline"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open @{botUsername}
                  </Button>
                </div>

                {/* Step 3 */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Step 3: Link</span>
                    <Badge>3 of 3</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send this message to the bot:
                  </p>
                  <code className="block bg-muted px-4 py-2 rounded text-sm font-mono">
                    /link {linkCode}
                  </code>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 After linking, trade naturally: "Buy 10 USDC of WETH"
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

