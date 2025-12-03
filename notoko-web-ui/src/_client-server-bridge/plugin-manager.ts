import { query } from "@solidjs/router";

import type {
  Functionality,
  FunctionalityFqn,
  Plugin,
  PluginId,
  PluginInstanceKey,
  PluginStatus,
} from "@notoko/definitions";
import type { PluginManager } from "@notoko/backend";

async function getPluginManagerSingleton(): Promise<PluginManager> {
  "use server";

  // @ts-ignore
  return globalThis.pluginManagerSingleton ??= await (async () => {
    const { getPluginManagerSingleton } = await import("~/server/singletons");
    return getPluginManagerSingleton();
  })();
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
  "getPluginInstanceFunctionalityInfos",
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

export const getFunctionalityInfo = query(
  async (
    fqn: FunctionalityFqn,
  ): Promise<Functionality["info"] | "not_found"> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fqn);
    return accessor()?.info ?? "not_found";
  },
  "getFunctionalityInfo",
);
