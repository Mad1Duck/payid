import { WASI } from "wasi";

export async function loadWasm(
  binary: Buffer,
  wasi: WASI
): Promise<WebAssembly.Instance> {
  const module = await WebAssembly.compile(binary);

  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport
  });

  wasi.start(instance);

  return instance;
}
