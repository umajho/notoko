import * as z from "zod/v4";

import {
  type Plugin,
  PluginInstanceFunctionalityKey,
} from "@notoko/definitions";

import * as langCmn from "./basic/lang-cmn";

const StaticConfiguration = z.object({});

export const basicPlugin: Plugin = {
  type: "plugin:singleton",
  info: {
    associatedType: "plugin:singleton",
    shownName: "Basic Functionalities",
    version: "0.0.1",
    staticConfigurationSchema: [
      "json_schema",
      z.toJSONSchema(StaticConfiguration),
    ],
    defaultStaticConfiguration: {},
    initialStatus: "ready",
  },
  handlers: {
    entry: (ctx) => {
      ctx.setFunctionalities({
        [PluginInstanceFunctionalityKey.parse("cmn.phonemizer")]: {
          type: "functionality:phonemizer",
          info: {
            shownName: "Builtin Mandarin",
            associatedType: "functionality:phonemizer",
            supportedInputLanguages: langCmn.phonemizerSupportedInputLanguages,
            supportedOutputSegmentationFormats:
              langCmn.phonemizerSupportedOutputSegmentationFormats,
          },
          phonemize: langCmn.phonemize,
          isValidPhoneme: langCmn.isValidPhoneme,
        },
      });
    },
  },
};
