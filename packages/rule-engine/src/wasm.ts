export async function loadWasm(binary?: Buffer): Promise<WebAssembly.Instance> {
  let wasmBinary = binary;

  if (!wasmBinary || wasmBinary.length === 0) {
    if (typeof process !== "undefined" && process.versions?.node) {
      const { readFileSync } = await import("fs");
      const { join, dirname } = await import("path");
      const { fileURLToPath } = await import("url");

      const __dir = dirname(fileURLToPath(import.meta.url));
      wasmBinary = readFileSync(join(__dir, "wasm/rule_engine.wasm"));

      // Browser
    } else {
      const wasmUrl = new URL("../wasm/rule_engine.wasm", import.meta.url);
      const res = await fetch(wasmUrl);
      if (!res.ok) throw new Error(`Failed to load rule_engine.wasm: ${res.status}`);
      wasmBinary = Buffer.from(await res.arrayBuffer());
    }
  }

  const module = await WebAssembly.compile(wasmBinary);

  const wasiStub: Record<string, (...args: any[]) => any> = {
    fd_write: () => 8,
    fd_read: () => 8,
    fd_close: () => 0,
    fd_seek: () => 8,
    fd_fdstat_get: () => 8,
    fd_prestat_get: () => 8,
    fd_prestat_dir_name: () => 8,
    environ_get: () => 0,
    environ_sizes_get: () => 0,
    args_get: () => 0,
    args_sizes_get: () => 0,
    clock_time_get: () => 0,
    proc_exit: () => { },
    random_get: () => 0,
  };

  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasiStub,
  });

  const _init = instance.exports._initialize as (() => void) | undefined;
  if (_init) _init();

  return instance;
}