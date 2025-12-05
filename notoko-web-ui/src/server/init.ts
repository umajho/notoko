import Path from "node:path";
import FSP from "node:fs/promises";

import { getPluginManagerSingleton } from "./singletons";
import { FOLDER_PATHS_SHOULD_BE_CREATED, PLUGIN_PATH } from "./definitions";

async function init() {
  for (const path of FOLDER_PATHS_SHOULD_BE_CREATED) {
    await FSP.mkdir(path, { recursive: true });
  }

  const pluginManagerSingleton = getPluginManagerSingleton();
  await pluginManagerSingleton
    .registerPluginsInFolder(PLUGIN_PATH);
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
