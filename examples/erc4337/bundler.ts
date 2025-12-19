// bundler.ts
export class BundlerClient {
  constructor(
    private rpcUrl: string,
    private entryPoint: string
  ) { }

  async sendUserOperation(userOp: any) {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [userOp, this.entryPoint]
      })
    });

    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message);
    }

    return json.result; // userOpHash
  }
}
