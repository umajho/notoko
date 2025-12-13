import FS from "node:fs";

export function readPotentialFileAsUtf8Sync(path: string): string | null {
  try {
    const data = FS.readFileSync(path, "utf-8");
    return data;
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return null;
  }
}
