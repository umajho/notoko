import { action } from "@solidjs/router";

import type {
  DurationPrediction,
  DurationPredictResult,
  Functionality,
  FunctionalityFqn,
  IsValidPhonemeResult,
  Language,
  LanguageWithScript,
  PhonemeLexicon,
  PhonemeSegment,
  PhonemizeResult,
  PluginId,
  PluginInstanceKey,
} from "@notoko/definitions";

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

export type FunctionalityActionResult<T> =
  | ["ok", T]
  | ["error", "functionality_not_found"]
  | ["error", "functionality_type_mismatch", Functionality["type"]]
  | ["error", "exception", { message: string; trace?: string }];

export type PhonemizerPhonemizeActionInput = {
  specificer: {
    language: LanguageWithScript;
    outputPhonemeLexicon: PhonemeLexicon;
  };
  input: { text: string };
};

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
        await functionality.phonemize(input.specificer, input.input),
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
  specifier: { phonemeLexicon: PhonemeLexicon };
  input: { phoneme: string };
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
        await functionality.isValidPhoneme(input.specifier, input.input),
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

export type DurationPredictorPredictDurationActionInput = {
  specifier: { language: Language; phonemeLexicon: PhonemeLexicon };
  input: {
    phonemeSegments: PhonemeSegment[];
    speed: number;
  };
};

export const durationPredictorPredictDurationAction = action(
  async (
    fqn: FunctionalityFqn,
    input: DurationPredictorPredictDurationActionInput,
  ): Promise<FunctionalityActionResult<DurationPredictResult>> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fqn);

    const functionality = accessor();
    if (!functionality) return ["error", "functionality_not_found"];
    if (functionality.type !== "functionality:duration_predictor") {
      return ["error", "functionality_type_mismatch", functionality.type];
    }

    try {
      return [
        "ok",
        await functionality.predictDuration(input.specifier, input.input),
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

export type ProsodyGeneratorGenerateProsodyActionInput = {
  specifier: { language: Language; phonemeLexicon: PhonemeLexicon };
  input: {
    phonemeSegments: PhonemeSegment[];
    duration: ProsodyGeneratorGenerateProsodyActionInputDuration;
  };
};
export type ProsodyGeneratorGenerateProsodyActionInputDuration =
  | ["simple", { speed?: number }]
  | ["custom", DurationPrediction];

export const prosodyGeneratorGenerateProsodyAction = action(
  async (
    fqn: FunctionalityFqn,
    input: ProsodyGeneratorGenerateProsodyActionInput,
  ): Promise<FunctionalityActionResult<DurationPredictResult>> => {
    "use server";

    const pm = await getPluginManagerSingleton();
    const accessor = pm.getFunctionalityAccessorFor(fqn);

    const functionality = accessor();
    if (!functionality) return ["error", "functionality_not_found"];
    if (functionality.type !== "functionality:prosody_generator") {
      return ["error", "functionality_type_mismatch", functionality.type];
    }

    try {
      return [
        "ok",
        await functionality
          .generateProsody(input.specifier, input.input),
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
