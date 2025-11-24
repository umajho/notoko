import * as z from "zod/v4";

import { type Plugin, PluginId } from "~/definitions";

import { basicPlugin } from "./builtin-plugins/basic.mod";
import { prototypingJsonApiConnectorPlugin } from "./builtin-plugins/prototyping";

export const builtinPlugins: Record<PluginId, Plugin> = {
  [PluginId.parse("builtin.basic")]: basicPlugin,
  [PluginId.parse("builtin.prototyping.json_api_connector")]:
    prototypingJsonApiConnectorPlugin,
};
