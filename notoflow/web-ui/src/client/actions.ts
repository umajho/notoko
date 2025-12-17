import { action } from "@solidjs/router";

import type {
  FunctionalityFqn,
  FunctionalityMethodInvocationExResult,
  FunctionalityMethodName,
  PluginId,
  PluginInstanceKey,
} from "@notoflow/definitions";

import { getPluginManagerSingleton } from "./singletons-use-server";

export const newPluginInstanceAction = action(
  async (
    pluginId: PluginId,
    newInstanceKey: PluginInstanceKey,
    staticConfig: any,
  ) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    pm.newPluginInstance(pluginId, newInstanceKey, {
      submittedStaticConfiguration: staticConfig,
    });
  },
);

export const removePluginInstanceAction = action(async (
  pluginId: PluginId,
  instanceKey: PluginInstanceKey,
) => {
  "use server";

  const pm = await getPluginManagerSingleton();
  pm.removePluginInstance(pluginId, instanceKey);
});

export const setPluginInstanceStaticConfigurationAction = action(
  async (pluginId: PluginId, instanceKey: PluginInstanceKey, newData: any) => {
    "use server";

    const pm = await getPluginManagerSingleton();
    pm.setStaticConfigurationFor(pluginId, instanceKey, newData);
  },
);

export const invokeFunctionalityMethodAction = action(
  async (
    fnFqn: FunctionalityFqn,
    methodName: FunctionalityMethodName,
    specifier: unknown,
    input: unknown,
  ): Promise<FunctionalityMethodInvocationExResult<unknown>> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fnFqn);

    const functionality = accessor();
    if (!functionality) return ["ex_error", "functionality_not_found"];

    const method = functionality.methods[methodName];
    if (!method) return ["ex_error", "functionality_method_not_found"];

    try {
      return await method(specifier, input);
    } catch (e) {
      return ["ex_error", "exception", {
        message: String(e),
        trace: (e instanceof Error) ? e.stack : undefined,
      }];
    }
  },
);
