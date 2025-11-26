import FSP from "fs/promises";

import { FOLDER_PATHS_SHOULD_BE_CREATED } from "~/definitions.mod";

import { builtinPlugins } from "./server/builtin-plugins.mod";
import { getPluginManagerSingleton } from "./server/plugin-manager.mod";

async function init() {
  for (const path of FOLDER_PATHS_SHOULD_BE_CREATED) {
    await FSP.mkdir(path, { recursive: true });
  }

  const pluginManagerSingleton = getPluginManagerSingleton();
  pluginManagerSingleton.registerPlugin(builtinPlugins);
}

let hasInitialized = false;

export async function initializeOnce() {
  if (hasInitialized) return;
  await navigator.locks.request("notoko:init", async () => {
    if (hasInitialized) return;
    await init();
    hasInitialized = true;
  });
}
