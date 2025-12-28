export function canonicalize(obj: any): string {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(",")}]`;
  }
  if (obj !== null && typeof obj === "object") {
    return `{${Object.keys(obj)
      .sort()
      .map(
        (k) => `"${k}":${canonicalize(obj[k])}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}
