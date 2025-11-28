import { action, query } from "@solidjs/router";

import type {
  Functionality,
  FunctionalityFqn,
  IsValidPhonemeResult,
  PhonemizeResult,
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

export type PhonemizerPhonemizeActionInput = {
  language: { "iso639-3": string; script: { "iso15924": string } };
  text: string;
  options: {
    outputSegmentationFormat: string;
  };
};
export type FunctionalityActionResult<T> =
  | ["ok", T]
  | ["error", "functionality_not_found"]
  | ["error", "functionality_type_mismatch", Functionality["type"]]
  | ["error", "exception", { message: string; trace?: string }];

export const phonemizerPhonemizeAction = action(
  async (
    fqn: FunctionalityFqn,
    input: PhonemizerPhonemizeActionInput,
  ): Promise<FunctionalityActionResult<PhonemizeResult>> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fqn);

    const functionality = accessor();
    if (!functionality) return ["error", "functionality_not_found"];
    if (functionality.type !== "functionality:phonemizer") {
      return ["error", "functionality_type_mismatch", functionality.type];
    }

    try {
      return [
        "ok",
        await functionality.phonemize(
          input.language,
          input.text,
          { outputSegmentationFormat: input.options.outputSegmentationFormat },
        ),
      ];
    } catch (e) {
      return [
        "error",
        "exception",
        {
          message: String(e),
          trace: (e instanceof Error) ? e.stack : undefined,
        },
      ];
    }
  },
);

export type PhonemizerIsValidPhonemeActionInput = {
  segmentationFormat: string;
  phoneme: string;
};

export const phonemizerIsValidPhonemeAction = action(
  async (
    fqn: FunctionalityFqn,
    input: PhonemizerIsValidPhonemeActionInput,
  ): Promise<FunctionalityActionResult<IsValidPhonemeResult>> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fqn);

    const functionality = accessor();
    if (!functionality) return ["error", "functionality_not_found"];
    if (functionality.type !== "functionality:phonemizer") {
      return ["error", "functionality_type_mismatch", functionality.type];
    }

    try {
      return [
        "ok",
        await functionality.isValidPhoneme(
          input.segmentationFormat,
          input.phoneme,
        ),
      ];
    } catch (e) {
      return [
        "error",
        "exception",
        {
          message: String(e),
          trace: (e instanceof Error) ? e.stack : undefined,
        },
      ];
    }
  },
);
