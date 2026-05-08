import { get } from "lodash";

export function validateRequiredContext(
  context: any,
  requires?: string[]
) {
  if (!requires) return;

  for (const path of requires) {
    const value = get(context, path);
    if (value === undefined || value === null) {
      throw new Error(`Missing required context field: ${path}`);
    }
  }
}
