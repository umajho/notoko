import { match, P } from "ts-pattern";
import * as z from "zod/v4";

import {
  definePluginHandlers,
  DurationInput,
  DurationPrediction,
  type Functionality,
  Language,
  PhonemeLexicon,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  ProsodyData,
} from "@notoko/definitions";

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

const JsonApiServerGetInfoResponse = z.object({
  durationPredictors: z.record(
    z.string(),
    z.object({
      shownName: z.string(),
      specification: Specification,
      configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
      defaultConfiguration: z.any(),
    }),
  ),
  prosodyGenerators: z.record(
    z.string(),
    z.object({
      shownName: z.string(),
      specification: Specification,
      durationInput: DurationInput,
      configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
      defaultConfiguration: z.any(),
    }),
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
        fns[key] = {
          type: "functionality:duration_predictor",
          info: {
            shownName: content.shownName,
            associatedType: "functionality:duration_predictor",
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
          predictDuration: async (specifier, input) => {
            const reqBody = JSON.stringify({
              specifier,
              speed: input.speed,
              segments: input.phonemeSegments,
            });
            const resp = await fetch(new URL("predict_duration", entrypoint), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: reqBody,
            });
            const data = await resp.json();
            if (data[0] === "ok") {
              return ["ok", DurationPrediction.parse(data[1])];
            }
            return data;
          },
        };
      }
      for (const [name, content] of Object.entries(info.prosodyGenerators)) {
        const key = PluginInstanceFunctionalityKey
          .parse("prosody_generator.stock." + name);
        fns[key] = {
          type: "functionality:prosody_generator",
          info: {
            shownName: content.shownName,
            associatedType: "functionality:prosody_generator",
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
          generateProsody: async (specifier, input) => {
            const reqBody = JSON.stringify({
              specifier,
              segments: input.phonemeSegments,
              ...match(input.duration)
                .with(["simple", P.select()], (x) => x)
                .with(["custom", P.select()], (x) => x)
                .exhaustive(),
            });
            const resp = await fetch(new URL("generate_prosody", entrypoint), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: reqBody,
            });
            const data = await resp.json();
            if (data[0] === "ok") {
              return ["ok", ProsodyData.parse(data[1])];
            }
            return data;
          },
        };
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

function normalizeUrl(url: string) {
  return url + (url.endsWith("/") ? "" : "/");
}
