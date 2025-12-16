import { match, P } from "ts-pattern";
import * as z from "zod/v4";

import {
  definePluginHandlers,
  type Functionality,
  FunctionalityDictionaryEntryKey,
  type FunctionalityMethodInvocationResult,
  makeFunctionalityDictionaryEntryFqn,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
} from "@notoflow/definitions";

import {
  DurationPrediction,
  FeaturePredictionOverrideSupport,
  Language,
  PhonemeLexicon,
  ProsodyData,
  ProsodyFeaturesPredictorPredictInput,
  ProsodyFeaturesPredictorPredictOutput,
  ProsodyFeaturesPredictorPredictSpecifier,
  ProsodyGeneratorGenerateProsodyInput,
  ProsodyGeneratorGenerateProsodyOutput,
  ProsodyGeneratorGenerateProsodySpecifier,
} from "../notoko/definitions";

const StaticConfiguration = z.object({
  entrypointUrl: z.url(),
});
type StaticConfiguration = z.infer<typeof StaticConfiguration>;

const Specification = z.object({
  supportedLanguageAndPhonemeLexiconCombinations: z.array(z.object({
    language: Language,
    phonemeLexiconRanked: z.array(PhonemeLexicon),
  })),
});
type Specification = z.infer<typeof Specification>;

const JsonApiServerGetInfoResponseProsodyFeaturesPredictorContent = z.object({
  shownName: z.string(),
  specification: Specification,
  configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
  defaultConfiguration: z.any(),
});
type JsonApiServerGetInfoResponseProsodyFeaturesPredictorContent = z //
.infer<typeof JsonApiServerGetInfoResponseProsodyFeaturesPredictorContent>;

const JsonApiServerGetInfoResponseProsodyGeneratorContent = z.object({
  shownName: z.string(),
  specification: Specification,
  durationInput: FeaturePredictionOverrideSupport,
  configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
  defaultConfiguration: z.any(),
});
type JsonApiServerGetInfoResponseProsodyGeneratorContent = z //
.infer<typeof JsonApiServerGetInfoResponseProsodyGeneratorContent>;

const JsonApiServerGetInfoResponse = z.object({
  prosodyFeaturesPredictors: z.record(
    z.string(),
    JsonApiServerGetInfoResponseProsodyFeaturesPredictorContent,
  ),
  prosodyGenerators: z.record(
    z.string(),
    JsonApiServerGetInfoResponseProsodyGeneratorContent,
  ),
});
type JsonApiServerGetInfoResponse = z //
.infer<typeof JsonApiServerGetInfoResponse>;

export default definePluginHandlers({
  entry: (ctx) => {
    let entrypoint: URL;
    let info!: JsonApiServerGetInfoResponse;

    ctx.onChangeStaticConfiguration = async (cfg: any) => {
      ctx.setStatus("loading");
      ctx.setFunctionalities({});

      try {
        entrypoint = new URL(normalizeUrl(cfg.entrypointUrl));

        const resp = await fetch(new URL("info", entrypoint));
        info = JsonApiServerGetInfoResponse.parse(await resp.json());
        ctx.setStatus("ready");
        handleAfterReady();
      } catch (e) { // TODO: handle error properly.
        console.error(e);
        ctx.setStatus("error"); // TODO: should contain error details.
      }
    };

    function handleAfterReady() { // TODO: handle error properly.
      const fns: Record<PluginInstanceFunctionalityKey, Functionality> = {};
      for (
        const [name, content] of Object.entries(info.prosodyFeaturesPredictors)
      ) {
        const key = PluginInstanceFunctionalityKey
          .parse("prosody_features_predictor.stock." + name);
        fns[key] = makeFunctionalityProsodyFeaturesPredictor(name, content, {
          entrypoint,
        });
      }
      for (const [name, content] of Object.entries(info.prosodyGenerators)) {
        const key = PluginInstanceFunctionalityKey
          .parse("prosody_generator.stock." + name);
        fns[key] = makeFunctionalityProsodyGenerator(name, content, {
          entrypoint,
        });
      }
      ctx.setFunctionalities(fns);
    }
  },
  recommendPluginInstanceKey: (config: any) => {
    let url = (config as StaticConfiguration)?.entrypointUrl;
    if (!url) return null;
    const result = PluginInstanceKey.safeParse(normalizeUrl(url));
    if (!result.success) return null;
    return result.data;
  },
});

function makeFunctionalityProsodyFeaturesPredictor(
  _name: string,
  content: JsonApiServerGetInfoResponseProsodyFeaturesPredictorContent,
  opts: {
    entrypoint: URL;
  },
): Functionality {
  return {
    info: {
      dictionaryEntryFqn: makeFunctionalityDictionaryEntryFqn(
        PluginId.parse("notoko"),
        FunctionalityDictionaryEntryKey.parse("prosody_features_predictor"),
      ),
      shownName: content.shownName,
      specification: {
        supportedLanguageAndPhonemeLexiconCombinations: content
          .specification.supportedLanguageAndPhonemeLexiconCombinations
          .flatMap((c) =>
            c.phonemeLexiconRanked.map((phonemeLexicon) => ({
              language: Language.parse(c.language),
              phonemeLexicon,
            }))
          ),
      },
    },
    methods: {
      predict: async (
        specifier_: unknown,
        input_: unknown,
      ): Promise<
        FunctionalityMethodInvocationResult<
          ProsodyFeaturesPredictorPredictOutput
        >
      > => {
        const specifier = ProsodyFeaturesPredictorPredictSpecifier
          .parse(specifier_);
        const input = ProsodyFeaturesPredictorPredictInput.parse(input_);

        const reqBody = JSON.stringify({ specifier, ...input });
        const resp = await fetch(
          new URL("predict_prosody_features", opts.entrypoint),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: reqBody,
          },
        );
        const data = await resp.json();
        return match(data)
          .returnType<
            FunctionalityMethodInvocationResult<
              ProsodyFeaturesPredictorPredictOutput
            >
          >()
          .with(
            ["ok", P.select()],
            (x) => ["ok", ProsodyFeaturesPredictorPredictOutput.parse(x)],
          )
          .with(
            ["error", P.select()],
            (
              msg,
            ) => [
              "error",
              "custom",
              `error from server: ${JSON.stringify(msg)}`,
            ],
          )
          .otherwise((
            data,
          ) => [
            "error",
            "custom",
            `unknown server response: ${JSON.stringify(data)}`,
          ]);
      },
    },
  };
}

function makeFunctionalityProsodyGenerator(
  _name: string,
  content: JsonApiServerGetInfoResponseProsodyGeneratorContent,
  opts: {
    entrypoint: URL;
  },
): Functionality {
  return {
    info: {
      dictionaryEntryFqn: makeFunctionalityDictionaryEntryFqn(
        PluginId.parse("notoko"),
        FunctionalityDictionaryEntryKey.parse("prosody_generator"),
      ),
      shownName: content.shownName,
      specification: {
        supportedLanguageAndPhonemeLexiconCombinations: content
          .specification.supportedLanguageAndPhonemeLexiconCombinations
          .flatMap((c) =>
            c.phonemeLexiconRanked.map((phonemeLexicon) => ({
              language: c.language,
              phonemeLexicon,
            }))
          ),
        durationInput: content.durationInput,
      },
    },
    methods: {
      generateProsody: async (specifier_: unknown, input_: unknown): Promise<
        FunctionalityMethodInvocationResult<
          ProsodyGeneratorGenerateProsodyOutput
        >
      > => {
        const specifier = ProsodyGeneratorGenerateProsodySpecifier
          .parse(specifier_);
        const input = ProsodyGeneratorGenerateProsodyInput.parse(input_);

        const reqBody = JSON.stringify({ specifier, ...input });
        const resp = await fetch(new URL("generate_prosody", opts.entrypoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: reqBody,
        });
        const data = await resp.json();
        return match(data)
          .returnType<
            FunctionalityMethodInvocationResult<
              ProsodyGeneratorGenerateProsodyOutput
            >
          >()
          .with(["ok", P.select()], (x) => ["ok", ProsodyData.parse(x)])
          .with(
            ["error", P.select()],
            (
              msg,
            ) => [
              "error",
              "custom",
              `error from server: ${JSON.stringify(msg)}`,
            ],
          )
          .otherwise((
            data,
          ) => [
            "error",
            "custom",
            `unknown server response: ${JSON.stringify(data)}`,
          ]);
      },
    },
  };
}

function normalizeUrl(url: string) {
  return url + (url.endsWith("/") ? "" : "/");
}
