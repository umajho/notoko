import * as z from "zod/v4";
import * as _ from "es-toolkit";

import {
  type Functionality,
  type Plugin,
  type PluginContext,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  type PluginStatus,
  SINGLETON_PLUGIN_INSTANCE_KEY,
} from "@notoko/definitions";

import {
  createRuntimeData,
  type RuntimeTreeNode,
} from "./plugin-manager/runtime-data";
import { PersistentDataManager } from "./plugin-manager/persistent-data";
import { untrack } from "@notoko/utils/alien-signals";

export type RegisterPluginErrorContent =
  | ["id_conflict", { conflictedId: PluginId }]
  | ["bad_id", { id: string; error: z.ZodError }];

function makePluginManager() {
  const persistentDataManager = new PersistentDataManager();

  const {
    $runtimeTree,
    $pluginIds,
    $infos,
    $instanceKeys,
    set$statusFor,
    getStatusAccessorFor,
    set$functionalitiesFor,
    getFunctionalityAccessorFor,
    getFunctionalityInfosAccessorFor,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
  } = createRuntimeData();

  async function registerPlugin(
    pluginMap: Record<PluginId, Plugin>,
  ): Promise<["ok"] | ["error", RegisterPluginErrorContent[]]> {
    const errors: RegisterPluginErrorContent[] = [];

    for (const [id, node] of Object.entries(pluginMap)) {
      if (id in $runtimeTree()) throw new Error("TODO: handle id conflict.");
      switch (node.type) {
        case "plugin:singleton": {
          const idResult = PluginId.safeParse(id);
          if (!idResult.success) {
            errors.push(["bad_id", { id, error: idResult.error }]);
            continue;
          }
          const pluginId = idResult.data;

          persistentDataManager
            .initializeInstance(pluginId, SINGLETON_PLUGIN_INSTANCE_KEY, {
              defaultStaticConfiguration: node.info.defaultStaticConfiguration,
            });

          const { context, changeStaticConfiguration, requestRefresh } =
            createContext(pluginId, SINGLETON_PLUGIN_INSTANCE_KEY, {
              set$functionalitiesFor,
              set$statusFor,
            });

          const staticConfigurationChangeHandlerHandle = persistentDataManager
            .addInstanceStaticConfigurationChangeHandler(
              pluginId,
              SINGLETON_PLUGIN_INSTANCE_KEY,
              changeStaticConfiguration,
            );

          const rtmNode: RuntimeTreeNode = {
            plugin: node,
            requestRefresh,
            dispose: (untilChildrenDisposed: Promise<void>) => {
              throw new Error(
                "TODO: implement `dispose` for `RuntimeTreeNode`.",
              );
              staticConfigurationChangeHandlerHandle.remove();
            },
          };
          $runtimeTree({
            ...untrack(() => $runtimeTree()),
            [pluginId]: rtmNode,
          });
          set$statusFor(
            pluginId,
            SINGLETON_PLUGIN_INSTANCE_KEY,
            node.initialStatus,
          );

          rtmNode.plugin.entry(context);

          break;
        }
        case "plugin:multiton": {
          throw new Error(
            "TODO: implement registering multition plugin nodes.",
          );
        }
        default:
          node satisfies never;
          throw new Error("unreachable!");
      }
    }

    if (errors.length > 0) {
      return ["error", errors] as const;
    }
    return ["ok"];
  }

  return {
    registerPlugin,
    $pluginIds,
    $infos,
    getStatusAccessorFor,
    $instanceKeys,
    getFunctionalityAccessorFor,
    getFunctionalityInfosAccessorFor,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
    setStaticConfigurationFor: persistentDataManager
      .setInstanceStaticConfiguration.bind(persistentDataManager),
    getStaticConfigurationAccessorFor: persistentDataManager
      .getInstanceStaticConfigurationAccessor.bind(persistentDataManager),
  };
}

function createContext(
  pluginId: PluginId,
  instanceKey: PluginInstanceKey,
  opts: {
    set$functionalitiesFor: (
      pluginId: PluginId,
      instanceKey: PluginInstanceKey,
      functionalities: Record<PluginInstanceFunctionalityKey, Functionality>,
    ) => void;
    set$statusFor: (
      pluginId: PluginId,
      instanceKey: PluginInstanceKey,
      status: PluginStatus,
    ) => void;
  },
) {
  let changeStaticConfigurationHandler: ((config: object) => void) | null =
    null;
  let pendingStaticConfigurationChange: object | null = null;
  let requestRefreshHandler: (() => void) | null = null;
  let hasPendingRefreshRequest = false;
  const context: PluginContext = {
    set onChangeStaticConfiguration(handler: (config: object) => void) {
      changeStaticConfigurationHandler = handler;
      if (pendingStaticConfigurationChange) {
        handler(pendingStaticConfigurationChange);
        pendingStaticConfigurationChange = null;
      }
    },
    set onRequestRefresh(handler: () => void) {
      requestRefreshHandler = handler;
      if (hasPendingRefreshRequest) {
        handler();
        hasPendingRefreshRequest = false;
      }
    },
    set onDispose(
      handler: (untilChildrenAreDisposed: Promise<void>) => Promise<void>,
    ) {
      throw new Error(
        "TODO: implement `set onDispose` on `PluginNodeContext`.",
      );
    },
    setStatus: (status: PluginStatus) => {
      opts.set$statusFor(pluginId, instanceKey, status);
    },
    setFunctionalities: (
      functionalities: Record<PluginInstanceFunctionalityKey, Functionality>,
    ) => {
      opts.set$functionalitiesFor(pluginId, instanceKey, functionalities);
    },
  };
  return {
    context,
    changeStaticConfiguration: (config: object) => {
      if (changeStaticConfigurationHandler) {
        changeStaticConfigurationHandler(config);
      } else {
        pendingStaticConfigurationChange = config;
      }
    },
    requestRefresh: () => {
      if (requestRefreshHandler) {
        requestRefreshHandler();
      } else {
        hasPendingRefreshRequest = true;
      }
    },
  };
}

export { makePluginManager };
export type PluginManager = ReturnType<typeof makePluginManager>;
