export function randomHex(bytes: number): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Crypto API not available in this environment");
  }

  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);

  return (
    "0x" +
    Array.from(arr, b => b.toString(16).padStart(2, "0")).join("")
  );
}