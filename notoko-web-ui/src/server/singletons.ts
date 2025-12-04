import { makePluginManager, type PluginManager } from "@notoko/backend";

import { DATA_PLUGIN_DATA_PATH } from "./definitions";

export function getPluginManagerSingleton(): PluginManager {
  // @ts-ignore
  return globalThis.pluginManagerSingleton ??= makePluginManager({
    pluginDataPath: DATA_PLUGIN_DATA_PATH,
  });
}
