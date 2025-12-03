import FSP from "fs/promises";

import { FOLDER_PATHS_SHOULD_BE_CREATED } from "@notoko/definitions";

import { builtinPlugins } from "@notoko/builtin-plugins";

import { getPluginManagerSingleton } from "./server/singletons";

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
