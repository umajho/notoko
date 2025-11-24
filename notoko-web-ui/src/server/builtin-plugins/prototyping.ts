import * as z from "zod/v4";

import { type PluginNode } from "~/definitions";

const StaticConfiguration = z.object({
  entrypointUrl: z.url(),
});

export const prototypingJsonApiConnectorPlugin: PluginNode = {
  // TODO: the proper version of this plugin should be a multiton.
  type: "plugin_node:singleton",
  info: {
    shownName: "JSON API Connector Prototype",
    version: "0.0.1",
    staticConfigurationSchema: [
      "json_schema",
      z.toJSONSchema(StaticConfiguration),
    ],
  },
  initialStatus: "loading",
  entry: (ctx) => {
  },
  defaultStaticConfiguration: {
    entrypointUrl: "http://localhost:11111/",
  },
};
