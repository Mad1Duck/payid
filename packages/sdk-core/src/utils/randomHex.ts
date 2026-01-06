// src/utils/randomHex.ts
export function randomHex(bytes: number): string {
  if (typeof globalThis.crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return (
      "0x" +
      Array.from(arr, b => b.toString(16).padStart(2, "0")).join("")
    );
  }

  const { randomBytes } = require("crypto");
  return "0x" + randomBytes(bytes).toString("hex");
}
