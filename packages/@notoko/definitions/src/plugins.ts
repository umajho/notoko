import z from "zod/v4";

import type { Functionality } from "./functionalities";
import {
  PluginId,
  type PluginInstanceFunctionalityKey,
  PluginInstanceKey,
} from "./names";

export const PluginContainerConfiguration = z.object({
  include: z.array(z.string()),
});
export type PluginContainerConfiguration = z.//
infer<typeof PluginContainerConfiguration>;

export const PluginStatus = z.enum(["loading", "ready", "error"]);
export type PluginStatus = z.infer<typeof PluginStatus>;

export const PluginStaticConfigurationTemplate = z.object({
  content: z.any(),
  asStock: z.object({ pluginInstanceKey: PluginInstanceKey }).optional(),
});
export type PluginStaticConfigurationTemplate = z //
.infer<typeof PluginStaticConfigurationTemplate>;

const PluginConfigurationBase = z.object({
  id: PluginId,
  version: z.string(),
  shownName: z.string(),
  staticConfigurationSchema: z.tuple([z.literal("json_schema"), z.any()]),
  initialStatus: PluginStatus,
});
type PluginConfigurationBase = z.infer<typeof PluginConfigurationBase>;
export const PluginConfigurationSingleton = PluginConfigurationBase.extend({
  type: z.literal("plugin:singleton"),
  defaultStaticConfiguration: z.any(),
});
export type PluginConfigurationSingleton = z.//
infer<typeof PluginConfigurationSingleton>;
export const PluginConfigurationMultiton = PluginConfigurationBase.extend({
  type: z.literal("plugin:multiton"),
  staticConfigurationTemplates: z.array(PluginStaticConfigurationTemplate),
});
export type PluginConfigurationMultiton = z.//
infer<typeof PluginConfigurationMultiton>;
export const PluginConfiguration = z.discriminatedUnion("type", [
  PluginConfigurationSingleton,
  PluginConfigurationMultiton,
]);
export type PluginConfiguration = z.infer<typeof PluginConfiguration>;

type PluginBase = {
  handlers: {
    entry: (ctx: PluginContext) => void;
    /**
     * The configuration predefined by the plugin statically, which means it
     * cannot be changed after the plugin is registered.
     */
    upgradeStaticConfiguration?: (
      oldConfig: object,
      opts: { fromVersion: string },
    ) => object;
  };
};
export type PluginSingleton = PluginBase & {
  type: "plugin:singleton";
  info: PluginConfigurationSingleton;
  handlers: {};
};
export type PluginMultiton = PluginBase & {
  type: "plugin:multiton";
  info: PluginConfigurationMultiton;
  handlers: {
    recommendPluginInstanceKey?: (config: object) => PluginInstanceKey | null;
  };
};
export type Plugin = PluginSingleton | PluginMultiton;
export type PluginInfo = Plugin["info"];
export type PluginHandlers = Plugin["handlers"];

export interface PluginContext {
  set onChangeStaticConfiguration(handler: (config: object) => void);
  set onRequestRefresh(handler: () => void);
  set onDispose(
    handler: (untilChildrenAreDisposed: Promise<void>) => Promise<void>,
  );
  setStatus: (status: PluginStatus) => void;
  setFunctionalities: (
    functionalities: Record<
      PluginInstanceFunctionalityKey,
      Functionality
    >,
  ) => void;
}

export function definePluginHandlers(
  pluginHandlers: PluginHandlers,
): PluginHandlers {
  return pluginHandlers;
}
