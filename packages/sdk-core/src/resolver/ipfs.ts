import { verifyHash } from "./utils";

const DEFAULT_GATEWAY = "https://ipfs.io/ipfs/";

export async function resolveIpfsRule(
  uri: string,
  expectedHash?: string,
  gateway = DEFAULT_GATEWAY
): Promise<any> {
  const cid = uri.replace("ipfs://", "");
  const url = `${gateway}${cid}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IPFS_RULE_FETCH_FAILED: ${res.status}`);
  }

  const text = await res.text();
  verifyHash(text, expectedHash);

  return JSON.parse(text);
}
