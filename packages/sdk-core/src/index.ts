export { createPayID } from "./factory";

export * as sessionPolicy from "./sessionPolicy";
export * as rule from "./rule";
export * as issuer from "./issuer";
export * as context from "./context";
export * as server from "./core/client";
export * as client from "./core/server";

export type {
  PayIDClient,
  PayIDServer
} from "./core/types";
