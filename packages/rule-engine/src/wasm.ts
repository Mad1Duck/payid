let _wasmUrl = 'https://gateway.pinata.cloud/ipfs/bafkreigwfxsb7oot7v55x7vxslvj23csxl2fhk2w7hsnboe55o26s2mgfy';

let _instance: WebAssembly.Instance | null = null;
let _loading: Promise<WebAssembly.Instance> | null = null;

/**
 * Override URL tempat WASM di-fetch di browser.
 * Panggil sebelum createPayID() / createPayIDServer():
 *
 *   import { setWasmUrl } from 'payid-rule-engine';
 *   setWasmUrl('https://gateway.pinata.cloud/ipfs/YOUR_CID');
 */
export function setWasmUrl(url: string) {
  if (url === _wasmUrl) return;
  _wasmUrl = url;
  _instance = null;
  _loading = null;
}

const wasiStub: Record<string, (...args: any[]) => any> = {
  fd_write: () => 8, fd_read: () => 8, fd_close: () => 0,
  fd_seek: () => 8, fd_fdstat_get: () => 8, fd_prestat_get: () => 8,
  fd_prestat_dir_name: () => 8, environ_get: () => 0,
  environ_sizes_get: () => 0, args_get: () => 0, args_sizes_get: () => 0,
  clock_time_get: () => 0, proc_exit: () => { }, random_get: () => 0,
};

async function compile(binary: Uint8Array): Promise<WebAssembly.Instance> {
  const module = await WebAssembly.compile(binary);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasiStub,
  });
  const _init = instance.exports._initialize as (() => void) | undefined;
  if (_init) _init();
  return instance;
}

export async function loadWasm(binary?: Buffer | Uint8Array): Promise<WebAssembly.Instance> {
  if (binary && binary.length > 0) {
    return compile(binary instanceof Uint8Array ? binary : new Uint8Array(binary));
  }

  if (_instance) return _instance;

  if (_loading) return _loading;

  _loading = (async () => {
    let wasmBinary: Uint8Array;

    if (typeof process !== 'undefined' && process.versions?.node) {
      const { readFileSync } = await import(/* webpackIgnore: true */ 'fs');
      const { join, dirname } = await import(/* webpackIgnore: true */ 'path');
      const { fileURLToPath } = await import(/* webpackIgnore: true */ 'url');
      const __dir = dirname(fileURLToPath(import.meta.url));
      const buf = readFileSync(join(__dir, 'wasm/rule_engine.wasm'));
      wasmBinary = new Uint8Array(buf);
    } else {
      const res = await fetch(_wasmUrl);
      if (!res.ok) throw new Error(
        `[PAY.ID] Failed to fetch WASM from "${_wasmUrl}": HTTP ${res.status}`
      );
      wasmBinary = new Uint8Array(await res.arrayBuffer());
    }

    const instance = await compile(wasmBinary);
    _instance = instance;
    _loading = null;
    return instance;
  })();

  return _loading;
}