import { WASI } from "wasi";

export async function loadWasm(
  binary: Buffer,
  wasi: WASI
): Promise<WebAssembly.Instance> {
  const module = await WebAssembly.compile(binary);

  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport
  });

  // rule_engine.wasm adalah reactor module — bukan command module.
  // Node.js punya wasi.initialize(), tapi Bun belum support.
  // Solusi: panggil _initialize export langsung dari WASM instance (portable).
  const _init = instance.exports._initialize as (() => void) | undefined;
  if (_init) _init();

  return instance;
}