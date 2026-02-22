import type { RuleContext, RuleResult } from "payid-types";
import { loadWasm } from "./wasm";
export async function runWasmRule(
  context: RuleContext,
  config: any,
  wasmBinary?: Buffer,
): Promise<RuleResult> {
  const instance = await loadWasm(wasmBinary);

  const memory = instance.exports.memory as WebAssembly.Memory;
  const alloc = instance.exports.alloc as ((size: number) => number) | undefined;
  const free_ = instance.exports.free as ((ptr: number, size: number) => void) | undefined;
  const evaluate = instance.exports.evaluate as (
    a: number, b: number, c: number, d: number, e: number, f: number
  ) => number;

  if (!alloc || !evaluate) {
    throw new Error(`WASM missing exports: alloc=${!!alloc} evaluate=${!!evaluate}`);
  }

  const ctxBuf = Buffer.from(JSON.stringify(context));
  const cfgBuf = Buffer.from(JSON.stringify(config));
  const OUT_SIZE = 4096;

  const ctxPtr = alloc(ctxBuf.length);
  const cfgPtr = alloc(cfgBuf.length);
  const outPtr = alloc(OUT_SIZE);

  new Uint8Array(memory.buffer).set(ctxBuf, ctxPtr);
  new Uint8Array(memory.buffer).set(cfgBuf, cfgPtr);

  let rc: number;
  try {
    rc = evaluate(ctxPtr, ctxBuf.length, cfgPtr, cfgBuf.length, outPtr, OUT_SIZE);
  } catch (err) {
    throw new Error(`WASM evaluate threw: ${err}`);
  }

  if (rc < 0) throw new Error(`WASM evaluate failed rc=${rc}`);

  const out = Buffer.from(
    new Uint8Array(memory.buffer).slice(outPtr, outPtr + rc)
  );

  const result = JSON.parse(out.toString("utf8"));

  // free hanya kalau ada — beberapa build tidak export free
  if (free_) {
    free_(ctxPtr, ctxBuf.length);
    free_(cfgPtr, cfgBuf.length);
    free_(outPtr, OUT_SIZE);
  }

  return result;
}