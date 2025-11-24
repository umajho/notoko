export function prettyJsonStringify(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
