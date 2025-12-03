import { makePluginManager, type PluginManager } from "@notoko/backend";

export function getPluginManagerSingleton(): PluginManager {
  // @ts-ignore
  return globalThis.pluginManagerSingleton ??= makePluginManager();
}
