export { createPayID } from "./factory";

export * as sessionPolicy from "./sessionPolicy";
export * as rule from "./rule";
export * as issuer from "./issuer";
export * as context from "./context";
export * as eas from "./eas";
export * as engine from "./rule/engine";

export * as client from "./core/client";
export * as server from "./core/server";

export * from "./types/rule";
export * from "./types/context.v1";
export * from "./types/context.v2";
export * from "./types/result";
export * from "./types/attestation";
export * from "./attestation/verify";

export type {
  PayIDClient,
  PayIDServer
} from "./core/types";