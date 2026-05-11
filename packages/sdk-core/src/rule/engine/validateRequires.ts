function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: any, key: string) => acc?.[key], obj);
}

export function validateRequiredContext(
  context: any,
  requires?: string[]
) {
  if (!requires) return;

  for (const path of requires) {
    const value = getByPath(context, path);
    if (value === undefined || value === null) {
      throw new Error(`Missing required context field: ${path}`);
    }
  }
}
