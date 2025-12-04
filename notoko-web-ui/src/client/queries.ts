import { query } from "@solidjs/router";

import type { PluginId } from "@notoko/definitions";

import { getPluginManagerSingleton } from "./singletons-use-server";

export const getPluginInstaceKeyRecommendation = query(
  async (pluginId: PluginId, staticConfig: object) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    return pm.getPluginInstanceKeyRecommendationFor(pluginId, staticConfig);
  },
  "getPluginInstaceKeyRecommendation",
);
