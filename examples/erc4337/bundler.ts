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

  async sendUserOperation(
    userOp: Record<string, any>
  ): Promise<string> {
    return this.request(
      "eth_sendUserOperation",
      [userOp, this.entryPoint]
    );
  }

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

  async getUserOperationReceipt(
    userOpHash: string
  ): Promise<any | null> {
    try {
      return await this.request(
        "eth_getUserOperationReceipt",
        [userOpHash]
      );
    } catch (err: any) {
      if (err.message.includes("no result")) {
        return null;
      }
      throw err;
    }
  }

  async supportedEntryPoints(): Promise<string[]> {
    return this.request(
      "eth_supportedEntryPoints",
      []
    );
  }

  async waitForUserOperationReceipt(
    userOpHash: string,
    intervalMs = 3000
  ): Promise<any> {
    while (true) {
      const receipt =
        await this.getUserOperationReceipt(userOpHash);
      if (receipt) return receipt;
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  private async request<T>(
    method: string,
    params: any[]
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs
    );

    try {
      const res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.id,
          method,
          params
        }),
        signal: controller.signal
      });

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
        throw new Error("Bundler RPC returned no result");
      }

      return json.result;
    } finally {
      clearTimeout(timeout);
    }
  }
}
