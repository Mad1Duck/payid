// wasm.ts — WASI-free loader
// 
// WASM rule engine v4 tidak butuh WASI sama sekali (tidak ada file I/O, 
// tidak ada stdout/stderr, tidak ada proc_exit). Bun punya known issues 
// dengan WASI preview1 yang bisa menyebabkan hang.
//
// Solusi: pass minimal stub yang satisfy wasi_snapshot_preview1 interface,
// cukup untuk Rust allocator init tanpa dependency ke WASI runtime.

export async function loadWasm(
  binary: Buffer,
): Promise<WebAssembly.Instance> {

  const module = await WebAssembly.compile(binary);

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