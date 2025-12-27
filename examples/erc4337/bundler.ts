// bundler.ts
export interface JsonRpcResponse<T = any> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class BundlerClient {
  private id = 0;

  constructor(
    private readonly rpcUrl: string,
    private readonly entryPoint: string,
    private readonly timeoutMs = 15_000
  ) { }

  // ==========================
  // PUBLIC API
  // ==========================

  /**
   * Send ERC-4337 UserOperation to bundler
   */
  async sendUserOperation(
    userOp: Record<string, any>
  ): Promise<string> {
    return this.request<string>(
      "eth_sendUserOperation",
      [userOp, this.entryPoint]
    );
  }

  /**
   * Estimate gas for UserOperation
   */
  async estimateUserOperationGas(
    userOp: Record<string, any>
  ): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> {
    return this.request(
      "eth_estimateUserOperationGas",
      [userOp, this.entryPoint]
    );
  }

  /**
   * Get receipt after bundler inclusion
   */
  async getUserOperationReceipt(
    userOpHash: string
  ): Promise<any | null> {
    return this.request(
      "eth_getUserOperationReceipt",
      [userOpHash]
    );
  }

  /**
   * Check supported entry points
   */
  async supportedEntryPoints(): Promise<string[]> {
    return this.request(
      "eth_supportedEntryPoints",
      []
    );
  }

  // ==========================
  // INTERNAL JSON-RPC
  // ==========================

  private async request<T>(
    method: string,
    params: any[]
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs
    );

    let res: Response;

    try {
      res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.id,
          method,
          params
        }),
        signal: controller.signal
      });
    } catch (err: any) {
      throw new Error(
        `Bundler request failed: ${err.message}`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(
        `Bundler HTTP error ${res.status}`
      );
    }

    const json =
      (await res.json()) as JsonRpcResponse<T>;

    if (json.error) {
      throw new Error(
        `Bundler RPC error ${json.error.code}: ${json.error.message}`
      );
    }

    if (json.result === undefined) {
      throw new Error(
        "Bundler RPC returned no result"
      );
    }

    return json.result;
  }
}
