import { verifyHash } from "./utils";

export async function resolveHttpRule(
  uri: string,
  expectedHash?: string
): Promise<any> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`HTTP_RULE_FETCH_FAILED: ${res.status}`);
  }

  const text = await res.text();
  verifyHash(text, expectedHash);

  return JSON.parse(text);
}
