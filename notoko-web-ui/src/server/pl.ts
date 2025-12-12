import * as z from "zod/v4";

import {
  FunctionalityDictionaryEntryFqn,
  FunctionalityFqn,
  PluginId,
  PluginInstanceKey,
} from "@notoko/definitions";

export const PluginManagerTopic = z.union([
  z.literal("pluginIds"),
  z.tuple([z.literal("pluginInfo"), PluginId]),
  z.tuple([z.literal("pluginInstanceKeys"), PluginId]),
  z.tuple([z.literal("pluginInstanceStatus"), PluginId, PluginInstanceKey]),
  // deno-fmt-ignore
  z.tuple([z.literal("pluginInstanceFunctionalityInfos"), PluginId, PluginInstanceKey]),
  // deno-fmt-ignore
  z.tuple([z.literal("pluginInstanceStaticConfiguration"), PluginId, PluginInstanceKey]),
  z.tuple([z.literal("functionalityInfo"), FunctionalityFqn]),
]);
export type PluginManagerTopic = z.infer<typeof PluginManagerTopic>;

export const MessageToServer = z.union([
  z.tuple([z.literal("subscribe"), PluginManagerTopic]),
  z.tuple([z.literal("unsubscribe"), PluginManagerTopic]),
]);
export type MessageToServer = z.infer<typeof MessageToServer>;

export const MessageToClient = z.union([
  z.literal("ready"),
  z.tuple([z.literal("update"), PluginManagerTopic, z.unknown()]),
]);
export type MessageToClient = z.infer<typeof MessageToClient>;
