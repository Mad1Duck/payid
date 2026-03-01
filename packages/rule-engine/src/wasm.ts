export async function loadWasm(binary?: Buffer | Uint8Array): Promise<WebAssembly.Instance> {
  let wasmBinary: Buffer | Uint8Array | undefined = binary;

  if (!wasmBinary || wasmBinary.length === 0) {
    const { readFileSync } = await import(/* webpackIgnore: true */ "fs");
    const { join, dirname } = await import(/* webpackIgnore: true */ "path");
    const { fileURLToPath } = await import(/* webpackIgnore: true */ "url");
    const __dir = dirname(fileURLToPath(import.meta.url));
    wasmBinary = readFileSync(join(__dir, "wasm/rule_engine.wasm"));
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