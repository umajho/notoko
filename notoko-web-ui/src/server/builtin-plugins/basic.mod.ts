import * as z from "zod/v4";

import { PluginFunctionalityKey, type PluginNode } from "~/definitions";

import * as langCmn from "./basic/lang-cmn";

const StaticConfiguration = z.object({});

export const basicPlugin: PluginNode = {
  type: "plugin_node:singleton",
  info: {
    shownName: "Basic Functionalities",
    version: "0.0.1",
    staticConfigurationSchema: [
      "json_schema",
      z.toJSONSchema(StaticConfiguration),
    ],
  },
  initialStatus: "ready",
  entry: (ctx) => {
    ctx.setFunctionalities({
      [PluginFunctionalityKey.parse("cmn.phonemizer")]: {
        type: "plugin_functionality:phonemizer",
        supportedInputLanguages: langCmn.phonemizerSupportedInputLanguages,
        supportedOutputSegmentationFormats:
          langCmn.phonemizerSupportedOutputSegmentationFormats,
        phonemize: langCmn.phonemize,
        isValidPhoneme: langCmn.isValidPhoneme,
      },
    });
  },
  defaultStaticConfiguration: {},
};
