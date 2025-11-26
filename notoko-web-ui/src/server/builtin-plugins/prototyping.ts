import * as z from "zod/v4";

import { type Plugin } from "~/definitions.mod";

const StaticConfiguration = z.object({
  entrypointUrl: z.url(),
});

export const prototypingJsonApiConnectorPlugin: Plugin = {
  // TODO: the proper version of this plugin should be a multiton.
  type: "plugin:singleton",
  info: {
    shownName: "JSON API Connector Prototype",
    version: "0.0.1",
    staticConfigurationSchema: [
      "json_schema",
      z.toJSONSchema(StaticConfiguration),
    ],

    associatedType: "plugin:singleton",
    defaultStaticConfiguration: {
      entrypointUrl: "http://localhost:11111/",
    },
  },
  initialStatus: "loading",
  entry: (ctx) => {
    ctx.onChangeStaticConfiguration = (cfg) => {
      console.log(cfg);
      ctx.setStatus("ready");
    };
  },
};
