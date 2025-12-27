export const subtleCrypto: SubtleCrypto =
  globalThis.crypto?.subtle ??
  require("crypto").webcrypto.subtle;
