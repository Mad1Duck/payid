export { PayIDServer } from "./server";

import { PayIDServer } from "./server";
import type { ethers } from "ethers";

/** Server/backend factory for the `payid/server` sub-path import. */
export function createPayIDServer(params: {
  signer: ethers.Signer;
  wasm?: Uint8Array;
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
}): PayIDServer {
  return new PayIDServer(
    params.signer,
    params.trustedIssuers,
    params.debugTrace,
    params.wasm,
  );
}
