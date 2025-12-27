// src/utils/randomHex.ts
export function randomHex(bytes: number): string {
  // Browser & Node 18+
  if (typeof globalThis.crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return (
      "0x" +
      Array.from(arr, b => b.toString(16).padStart(2, "0")).join("")
    );
  }

  // Fallback (Node <18) — optional
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomBytes } = require("crypto");
  return "0x" + randomBytes(bytes).toString("hex");
}
