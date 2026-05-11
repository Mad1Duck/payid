export { PayIDClient } from "./client";

import { PayIDClient } from "./client";

/** Browser/edge-safe factory for the `payid/client` sub-path import. */
export function createPayIDClient(params?: {
  wasm?: Uint8Array;
  debugTrace?: boolean;
}): PayIDClient {
  return new PayIDClient(params?.debugTrace, params?.wasm);
}

/** Alias — kept for backwards compatibility with `import('payid/client')`. */
export { createPayIDClient as createPayID };
