import { match, P } from "ts-pattern";
import * as z from "zod/v4";

import {
  DurationInput,
  DurationPrediction,
  type Functionality,
  type Plugin,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  ProsodyData,
} from "@notoko/definitions";

const StaticConfiguration = z.object({
  entrypointUrl: z.url(),
});
type StaticConfiguration = z.infer<typeof StaticConfiguration>;

const SupportedInputLanguage = z.object({
  "iso639-3": z.string(),
  segmentationFormatsRanked: z.array(z.string()),
});
type SupportedInputLanguage = z.infer<typeof SupportedInputLanguage>;

const JsonApiServerGetInfoResponse = z.object({
  durationPredictors: z.record(
    z.string(),
    z.object({
      shownName: z.string(),
      supportedInputLanguages: z.array(SupportedInputLanguage),
      configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
      defaultConfiguration: z.any(),
    }),
  ),
  prosodyGenerators: z.record(
    z.string(),
    z.object({
      shownName: z.string(),
      supportedInputLanguages: z.array(SupportedInputLanguage),
      durationInput: DurationInput,
      configurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
      defaultConfiguration: z.any(),
    }),
  ),
});
type JsonApiServerGetInfoResponse = z //
.infer<typeof JsonApiServerGetInfoResponse>;

export const prototypingJsonApiConnectorPlugin: Plugin = {
  // TODO: the proper version of this plugin should be a multiton.
  type: "plugin:multiton",
  info: {
    associatedType: "plugin:multiton",
    shownName: "JSON API Connector Prototype",
    version: "0.0.1",
    staticConfigurationSchema: [
      "json_schema",
      z.toJSONSchema(StaticConfiguration),
    ],
    staticConfigurationTemplates: [],
    initialStatus: "loading",
  },
  handlers: {
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
        for (const [name, spec] of Object.entries(info.durationPredictors)) {
          const key = PluginInstanceFunctionalityKey
            .parse("duration_predictor.stock." + name);
          fns[key] = {
            type: "functionality:duration_predictor",
            info: {
              shownName: spec.shownName,
              associatedType: "functionality:duration_predictor",
              supportedInputLanguages: spec.supportedInputLanguages
                .flatMap((lang) =>
                  lang.segmentationFormatsRanked.map((segmentationFormat) => ({
                    "iso639-3": lang["iso639-3"],
                    segmentationFormat,
                  }))
                ),
            },
            predictDuration: async (language, segments, opts) => {
              const reqBody = JSON.stringify({
                language,
                speed: opts.speed,
                segments,
              });
              const resp = await fetch(
                new URL("predict_duration", entrypoint),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: reqBody,
                },
              );
              const data = await resp.json();
              if (data[0] === "ok") {
                return ["ok", DurationPrediction.parse(data[1])];
              }
              return data;
            },
          };
        }
        for (const [name, spec] of Object.entries(info.prosodyGenerators)) {
          const key = PluginInstanceFunctionalityKey
            .parse("prosody_generator.stock." + name);
          fns[key] = {
            type: "functionality:prosody_generator",
            info: {
              shownName: spec.shownName,
              associatedType: "functionality:prosody_generator",
              supportedInputLanguages: spec.supportedInputLanguages
                .flatMap((lang) =>
                  lang.segmentationFormatsRanked.map((segmentationFormat) => ({
                    "iso639-3": lang["iso639-3"],
                    segmentationFormat,
                  }))
                ),
              durationInput: spec.durationInput,
            },
            generateProsody: async (language, segments, duration) => {
              const reqBody = JSON.stringify({
                language,
                segments,
                ...match(duration)
                  .with(["simple", P.select()], (x) => x)
                  .with(["custom", P.select()], (x) => x)
                  .exhaustive(),
              });
              const resp = await fetch(
                new URL("generate_prosody", entrypoint),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: reqBody,
                },
              );
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
  },
};

function normalizeUrl(url: string) {
  return url + (url.endsWith("/") ? "" : "/");
}
