import { query } from "@solidjs/router";

import type {
  FunctionalityDictionaryEntryKey,
  FunctionalityMethodName,
  PluginId,
} from "@notoflow/definitions";

import { getPluginManagerSingleton } from "./singletons-use-server";

export const getPluginInstaceKeyRecommendation = query(
  async (pluginId: PluginId, staticConfig: object) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    return pm.getPluginInstanceKeyRecommendationFor(pluginId, staticConfig);
  },
  "getPluginInstaceKeyRecommendation",
);

export const getFunctionalityDemonstratorMethodUiSourceCode = query(
  async (
    dictPluginId: PluginId,
    functionalityDictionaryEntryKey: FunctionalityDictionaryEntryKey,
    methodName: FunctionalityMethodName,
  ) => {
    const resp = await fetch(
      [
        "/api/plugins/",
        dictPluginId,
        "functionality-dictionary",
        functionalityDictionaryEntryKey,
        "methods",
        methodName,
        "demonstrator.js",
      ].join("/"),
    );
  },
  "getFunctionalityDemonstratorMethodUiSourceCode",
);
