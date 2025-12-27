import { PayID } from "./core/payid";
import type { PayIDClient, PayIDServer } from "./core/types";

export function createPayID(params: {
  wasm: Uint8Array;
}): PayIDClient & PayIDServer {
  return new PayID(params.wasm);
}
