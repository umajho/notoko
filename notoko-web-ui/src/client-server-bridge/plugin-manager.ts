import { action, query } from "@solidjs/router";

import type {
  Plugin,
  PluginId,
  PluginInstanceKey,
  PluginStatus,
} from "~/definitions.mod";
import type { PluginManager } from "~/server/plugin-manager.mod";

async function getPluginManagerSingleton(): Promise<PluginManager> {
  "use server";

  const { getPluginManagerSingleton } = //
    await import("~/server/plugin-manager.mod");
  return getPluginManagerSingleton();
}

export const gePluginIds = query(async () => {
  "use server";

  const pm = await getPluginManagerSingleton();
  return pm.$pluginIds();
}, "gePluginIds");

export const getPluginInfo = query(
  async (pluginId: PluginId): Promise<Plugin["info"] | "not_found"> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const infos = pm.$infos();
    return infos[pluginId] ?? "not_found";
  },
  "getPluginInfo",
);

export const getPluginInstanceKeys = query(async (pluginId: PluginId) => {
  "use server";

  const pm = await getPluginManagerSingleton();
  const pluginToInstanceKeysMap = pm.$instanceKeys();
  return pluginToInstanceKeysMap[pluginId as any] ?? null;
}, "getPluginInstanceKeys");

export const getPluginInstanceStatus = query(
  async (
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Promise<PluginStatus | "unknown"> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getStatusAccessorFor(pluginId, instanceKey);
    return accessor();
  },
  "getPluginInstanceStatus",
);

export const getPluginInstanceFunctionalityInfos = query(
  async (pluginId: PluginId, instanceKey: PluginInstanceKey) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityInfosAccessorFor(pluginId, instanceKey);
    return accessor();
  },
  "getPluginInstanceFunctionalities",
);

export const getPluginInstanceStaticConfiguration = query(
  async (pluginId: PluginId, instanceKey: PluginInstanceKey) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getStaticConfigurationAccessorFor(
      pluginId,
      instanceKey,
    );
    return accessor();
  },
  "getPluginInstanceStaticConfiguration",
);

export const setPluginInstanceStaticConfigurationAction = action(
  async (pluginId: PluginId, instanceKey: PluginInstanceKey, newData: any) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    pm.setStaticConfigurationFor(pluginId, instanceKey, newData);
  },
);
