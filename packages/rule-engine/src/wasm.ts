export async function loadWasm(binary: Buffer): Promise<WebAssembly.Instance> {
  const module = await WebAssembly.compile(binary);

  // WASI stub — tidak pakai new WASI() karena hang di Bun
  // Rule engine tidak butuh file I/O, stub ini cukup untuk satisfy imports
  const wasiStub: Record<string, (...args: any[]) => any> = {
    fd_write: () => 8,   // EBADF
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
    wasi_snapshot_preview1: wasiStub
  });

  const _init = instance.exports._initialize as (() => void) | undefined;
  if (_init) _init();

  return instance;
}
