import { WASI } from "wasi";
import type { RuleContext, RuleResult } from "payid-types";
import { loadWasm } from "./wasm";

export async function runWasmRule(
  wasmBinary: Buffer,
  context: RuleContext,
  config: any
): Promise<RuleResult> {
  const wasi = new WASI({ version: "preview1" });
  const instance = await loadWasm(wasmBinary, wasi);

  const memory = instance.exports.memory as WebAssembly.Memory;
  const alloc = instance.exports.alloc as (size: number) => number;
  const free = instance.exports.free as (ptr: number, size: number) => void;
  const evaluate = instance.exports.evaluate as (
    a: number, b: number, c: number, d: number, e: number, f: number
  ) => number;

  const ctxBuf = Buffer.from(JSON.stringify(context));
  const cfgBuf = Buffer.from(JSON.stringify(config));
  const OUT_SIZE = 4096;

  const ctxPtr = alloc(ctxBuf.length);
  const cfgPtr = alloc(cfgBuf.length);
  const outPtr = alloc(OUT_SIZE);

  try {
    new Uint8Array(memory.buffer).set(ctxBuf, ctxPtr);
    new Uint8Array(memory.buffer).set(cfgBuf, cfgPtr);

    const rc = evaluate(
      ctxPtr, ctxBuf.length,
      cfgPtr, cfgBuf.length,
      outPtr, OUT_SIZE
    );

    if (rc < 0) throw new Error(`WASM failed rc=${rc}`);

    const out = Buffer.from(
      new Uint8Array(memory.buffer).slice(outPtr, outPtr + rc)
    );

    return JSON.parse(out.toString("utf8"));
  } finally {
    free(ctxPtr, ctxBuf.length);
    free(cfgPtr, cfgBuf.length);
    free(outPtr, OUT_SIZE);
  }
}
