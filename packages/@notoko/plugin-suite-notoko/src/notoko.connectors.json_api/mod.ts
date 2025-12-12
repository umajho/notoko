import { match, P } from "ts-pattern";
import * as z from "zod/v4";

import {
  definePluginHandlers,
  type Functionality,
  FunctionalityDictionaryEntryKey,
  type FunctionalityMethodInvocationResult,
  Language,
  makeFunctionalityDictionaryEntryFqn,
  PhonemeLexicon,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
} from "@notoko/definitions";

import {
  DurationInputSupport,
  DurationPrediction,
  DurationPredictorPredictDurationInput,
  DurationPredictorPredictDurationOutput,
  DurationPredictorPredictDurationSpecifier,
  ProsodyData,
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

const JsonApiServerGetInfoResponseDurationPredictorContent = z.object({
  shownName: z.string(),
  specification: Specification,
  configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
  defaultConfiguration: z.any(),
});
type JsonApiServerGetInfoResponseDurationPredictorContent = z //
.infer<typeof JsonApiServerGetInfoResponseDurationPredictorContent>;

const JsonApiServerGetInfoResponseProsodyGeneratorContent = z.object({
  shownName: z.string(),
  specification: Specification,
  durationInput: DurationInputSupport,
  configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
  defaultConfiguration: z.any(),
});
type JsonApiServerGetInfoResponseProsodyGeneratorContent = z //
.infer<typeof JsonApiServerGetInfoResponseProsodyGeneratorContent>;

const JsonApiServerGetInfoResponse = z.object({
  durationPredictors: z.record(
    z.string(),
    JsonApiServerGetInfoResponseDurationPredictorContent,
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
      for (const [name, content] of Object.entries(info.durationPredictors)) {
        const key = PluginInstanceFunctionalityKey
          .parse("duration_predictor.stock." + name);
        fns[key] = makeFunctionalityDurationPredictor(name, content, {
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

function makeFunctionalityDurationPredictor(
  _name: string,
  content: JsonApiServerGetInfoResponseDurationPredictorContent,
  opts: {
    entrypoint: URL;
  },
): Functionality {
  return {
    info: {
      dictionaryEntryFqn: makeFunctionalityDictionaryEntryFqn(
        PluginId.parse("notoko"),
        FunctionalityDictionaryEntryKey.parse("duration_predictor"),
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
      predictDuration: async (
        specifier_: unknown,
        input_: unknown,
      ): Promise<
        FunctionalityMethodInvocationResult<
          DurationPredictorPredictDurationOutput
        >
      > => {
        const specifier = DurationPredictorPredictDurationSpecifier
          .parse(specifier_);
        const input = DurationPredictorPredictDurationInput.parse(input_);

        const reqBody = JSON.stringify({
          specifier,
          speed: input.speed,
          segments: input.phonemeSegments,
        });
        const resp = await fetch(new URL("predict_duration", opts.entrypoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: reqBody,
        });
        const data = await resp.json();
        return match(data)
          .returnType<
            FunctionalityMethodInvocationResult<
              DurationPredictorPredictDurationOutput
            >
          >()
          .with(["ok", P.select()], (x) => ["ok", DurationPrediction.parse(x)])
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

        const reqBody = JSON.stringify({
          specifier,
          segments: input.phonemeSegments,
          ...match(input.duration)
            .with(["simple", P.select()], (x) => x)
            .with(["custom", P.select()], (x) => x)
            .exhaustive(),
        });
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
