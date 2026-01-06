import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { PlayIcon, HashIcon, CheckCircle2Icon, XCircleIcon, TerminalIcon } from 'lucide-react';

// Sample data
const defaultRuleSet = JSON.stringify(
  {
    version: '1.0',
    rules: [
      {
        id: 'rule_001',
        condition: 'context.amount > 1000',
        action: 'require_approval',
        priority: 1,
      },
      {
        id: 'rule_002',
        condition: 'context.riskScore < 0.3',
        action: 'auto_approve',
        priority: 2,
      },
    ],
  },
  null,
  2,
);

const defaultContext = JSON.stringify(
  {
    transactionId: 'tx_abc123',
    amount: 1500,
    currency: 'USD',
    riskScore: 0.25,
    timestamp: Date.now(),
  },
  null,
  2,
);

export default function PayIDPlayground() {
  const [ruleSetInput, setRuleSetInput] = useState(defaultRuleSet);
  const [contextInput, setContextInput] = useState(defaultContext);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // SHA-256 mock implementation
  const mockSHA256 = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Evaluate rules against context
  const evaluateRules = (ruleSet: any, context: any) => {
    const results = [];

    for (const rule of ruleSet.rules) {
      try {
        // Simple evaluation (in production, use a proper expression evaluator)
        const conditionMet = eval(rule.condition.replace('context.', 'context.'));

        results.push({
          ruleId: rule.id,
          condition: rule.condition,
          action: rule.action,
          priority: rule.priority,
          matched: conditionMet,
          timestamp: Date.now(),
        });

        if (conditionMet) {
          return { action: rule.action, matchedRule: rule.id, allMatches: results };
        }
      } catch (err) {
        results.push({
          ruleId: rule.id,
          condition: rule.condition,
          error: 'Evaluation failed',
          matched: false,
        });
      }
    }

    return { action: 'no_match', matchedRule: null, allMatches: results };
  };

  const executeDecision = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      // Parse inputs
      const ruleSet = JSON.parse(ruleSetInput);
      const context = JSON.parse(contextInput);

      // Simulate WASM execution delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate hashes
      const ruleSetHash = await mockSHA256(ruleSetInput);
      const contextHash = await mockSHA256(contextInput);

      // Evaluate decision
      const decision = evaluateRules(ruleSet, context);

      // Generate decision proof
      const proof = {
        version: '1.0',
        executionId: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        inputs: {
          ruleSetHash,
          contextHash,
        },
        decision: {
          action: decision.action,
          matchedRule: decision.matchedRule,
          confidence: decision.matchedRule ? 1.0 : 0.0,
        },
        trace: decision.allMatches,
        signature: await mockSHA256(
          JSON.stringify({
            ruleSetHash,
            contextHash,
            decision: decision.action,
            timestamp: Date.now(),
          }),
        ),
      };

      setExecutionResult(proof);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold text-foreground">PAY.ID Playground</h1>
            <p className="font-mono text-sm text-muted-foreground">
              Deterministic off-chain execution simulator
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            v1.0.0
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <ResizablePanelGroup className="h-[calc(100vh-140px)] gap-4">
          {/* Left Panel: RuleSet Input */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-mono text-sm font-semibold">
                  <TerminalIcon className="size-4" />
                  Rule Set
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-full">
                  <Textarea
                    value={ruleSetInput}
                    onChange={(e) => setRuleSetInput(e.target.value)}
                    className="font-mono text-xs min-h-[500px] resize-none border-none p-0 focus-visible:ring-0"
                    placeholder="Enter rule set JSON..."
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle Panel: Context Input */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-mono text-sm font-semibold">
                  <TerminalIcon className="size-4" />
                  Context
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-full">
                  <Textarea
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    className="font-mono text-xs min-h-[500px] resize-none border-none p-0 focus-visible:ring-0"
                    placeholder="Enter context JSON..."
                  />
                </ScrollArea>
                <div className="mt-4">
                  <Button
                    onClick={executeDecision}
                    disabled={isExecuting}
                    className="w-full font-mono">
                    {isExecuting ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <PlayIcon className="size-4" />
                        Execute Decision
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel: Output */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-mono text-sm font-semibold">
                  <HashIcon className="size-4" />
                  Decision Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircleIcon className="size-4" />
                    <AlertTitle>Execution Error</AlertTitle>
                    <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                {!executionResult && !error && (
                  <div className="flex h-full items-center justify-center text-center">
                    <div className="text-muted-foreground">
                      <PlayIcon className="mx-auto mb-2 size-8 opacity-50" />
                      <p className="font-mono text-sm">Execute a decision to see results</p>
                    </div>
                  </div>
                )}

                {executionResult && (
                  <Tabs defaultValue="proof" className="h-full flex flex-col">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="proof" className="font-mono text-xs">
                        Proof
                      </TabsTrigger>
                      <TabsTrigger value="trace" className="font-mono text-xs">
                        Trace
                      </TabsTrigger>
                      <TabsTrigger value="raw" className="font-mono text-xs">
                        Raw
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="proof" className="flex-1 mt-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-4 font-mono text-xs">
                          <div>
                            <Alert>
                              <CheckCircle2Icon className="size-4" />
                              <AlertTitle className="font-mono">Execution Complete</AlertTitle>
                              <AlertDescription className="font-mono text-xs">
                                ID: {executionResult.executionId}
                              </AlertDescription>
                            </Alert>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <h3 className="font-semibold">Decision</h3>
                            <div className="rounded-md bg-muted p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Action:</span>
                                <Badge>{executionResult.decision.action}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Matched Rule:</span>
                                <span className="text-primary">
                                  {executionResult.decision.matchedRule || 'none'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Confidence:</span>
                                <span>{executionResult.decision.confidence}</span>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <h3 className="font-semibold">Input Hashes</h3>
                            <div className="rounded-md bg-muted p-3 space-y-2">
                              <div>
                                <div className="text-muted-foreground mb-1">RuleSet:</div>
                                <code className="text-[10px] break-all">
                                  {executionResult.inputs.ruleSetHash}
                                </code>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Context:</div>
                                <code className="text-[10px] break-all">
                                  {executionResult.inputs.contextHash}
                                </code>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <h3 className="font-semibold">Signature</h3>
                            <div className="rounded-md bg-muted p-3">
                              <code className="text-[10px] break-all">
                                {executionResult.signature}
                              </code>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="trace" className="flex-1 mt-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-2">
                          {executionResult.trace.map((item: any, idx: number) => (
                            <div key={idx} className="rounded-md border p-3 font-mono text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">{item.ruleId}</span>
                                <Badge variant={item.matched ? 'default' : 'outline'}>
                                  {item.matched ? 'Matched' : 'Not Matched'}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground text-[10px]">
                                <div>Condition: {item.condition}</div>
                                {item.action && <div>Action: {item.action}</div>}
                                {item.error && (
                                  <div className="text-destructive">Error: {item.error}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="raw" className="flex-1 mt-4">
                      <ScrollArea className="h-full">
                        <pre className="font-mono text-[10px] text-foreground whitespace-pre-wrap">
                          {JSON.stringify(executionResult, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
