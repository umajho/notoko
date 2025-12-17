export function prettyJsonStringify(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function stringToNull<T>(thing: T): Exclude<T, string> | null {
  if (typeof thing === "string") return null;
  return thing as Exclude<T, string>;
}

export function bothNonNull<T1, T2>(
  a: T1 | null,
  b: T2 | null,
): [T1, T2] | null {
  if (a === null || b === null) return null;
  return [a, b];
}

export function tryExtract<
  U extends string,
  T extends { [K in U]: string },
>(u: U, thing: T, expectedType: T[U]): Extract<T, { [K in U]: T[U] }> | null {
  return thing[u] === expectedType ? thing as any : null;
}
