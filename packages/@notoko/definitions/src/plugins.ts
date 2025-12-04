import type { Functionality } from "./functionalities";
import type {
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
} from "./names";

export type PluginStatus = "loading" | "ready" | "error";

type PluginBase = {
  info: {
    shownName: string;
    version: string;
    staticConfigurationSchema: ["json_schema", object];
  };
  initialStatus: PluginStatus;
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
export type PluginSingleton = PluginBase & {
  type: "plugin:singleton";
  info: {
    associatedType: "plugin:singleton";
    defaultStaticConfiguration: object;
  };
};
export type PluginMultiton = PluginBase & {
  type: "plugin:multiton";
  info: {
    associatedType: "plugin:multiton";
    staticConfigurationTemplates: {
      content: object;
      asStock?: { pluginInstanceKey: PluginInstanceKey };
    }[];
  };
  recommendPluginInstanceKey?: (config: object) => PluginInstanceKey | null;
};
export type Plugin = PluginSingleton | PluginMultiton;

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
