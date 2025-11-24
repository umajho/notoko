import * as z from "zod/v4";

import { type PluginNode, RootPluginNodeId } from "~/definitions";

import { basicPlugin } from "./builtin-plugins/basic.mod";
import { prototypingJsonApiConnectorPlugin } from "./builtin-plugins/prototyping";

export const builtinPlugins: Record<RootPluginNodeId, PluginNode> = {
  [RootPluginNodeId.parse("builtin.basic")]: basicPlugin,
  [RootPluginNodeId.parse("builtin.prototyping.json_api_connector")]:
    prototypingJsonApiConnectorPlugin,
};
