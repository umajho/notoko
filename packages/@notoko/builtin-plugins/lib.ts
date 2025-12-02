import { type Plugin, PluginId } from "@notoko/definitions";

import { basicPlugin } from "./src/basic.mod";
import { prototypingJsonApiConnectorPlugin } from "./src/prototyping";

export const builtinPlugins: Record<PluginId, Plugin> = {
  [PluginId.parse("builtin.basic")]: basicPlugin,
  [PluginId.parse("builtin.prototyping.json_api_connector")]:
    prototypingJsonApiConnectorPlugin,
};
