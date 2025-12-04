"use server";

import type { PluginManager } from "@notoko/backend";

export async function getPluginManagerSingleton(): Promise<PluginManager> {
  "use server";

  // @ts-ignore
  return globalThis.pluginManagerSingleton ??= await (async () => {
    const { getPluginManagerSingleton } = await import("~/server/singletons");
    return getPluginManagerSingleton();
  })();
}
