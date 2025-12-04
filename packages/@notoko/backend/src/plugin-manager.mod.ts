import * as FS from "fs";

import * as z from "zod/v4";
import * as _ from "es-toolkit";

import {
  DATA_PLUGIN_DATA_PATH,
  type Functionality,
  type Plugin,
  type PluginContext,
  PluginId,
  PluginInstanceFqn,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  type PluginStatus,
  SINGLETON_PLUGIN_INSTANCE_KEY,
  tryExtractPartsFromPluginInstanceFqn,
} from "@notoko/definitions";

import {
  createRuntimeData,
  type RuntimeTreeNode,
} from "./plugin-manager/runtime-data";
import { PersistentDataManager } from "./plugin-manager/persistent-data";
import { batch, untrack } from "@notoko/utils/alien-signals";

export type RegisterPluginErrorContent =
  | ["id_conflict", { conflictedId: PluginId }]
  | ["bad_id", { id: string; error: z.ZodError }];

function makePluginManager() {
  const knownMultitonInstances = getPluginInstancesKnownInDataFolder();

  const persistentDataManager = new PersistentDataManager();

  const {
    $runtimeTree,
    $pluginIds,
    $infos,
    $instanceKeys,
    getPluginInstanceKeyRecommendationFor,
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

    for (const [pluginId_, plugin] of Object.entries(pluginMap)) {
      const idResult = PluginId.safeParse(pluginId_);
      if (!idResult.success) {
        errors.push(["bad_id", { id: pluginId_, error: idResult.error }]);
        continue;
      }
      const pluginId = idResult.data;

      const newRtmNode: RuntimeTreeNode = { plugin, instances: {} };
      const runtimeTree = untrack(() => $runtimeTree());
      if (pluginId in runtimeTree) {
        throw new Error("TODO: handle plugin id conflict.");
      }

      const defers: (() => void)[] = [];

      switch (plugin.type) {
        case "plugin:singleton": {
          const key = SINGLETON_PLUGIN_INSTANCE_KEY;
          defers.push(
            registerPluginInstanceInternal(pluginId, key, newRtmNode, {
              defaultStaticConfiguration:
                plugin.info.defaultStaticConfiguration,
            }),
          );

          break;
        }
        case "plugin:multiton": {
          for (const stockTmpl of plugin.info.staticConfigurationTemplates) {
            if (!stockTmpl.asStock) continue;
            const key = stockTmpl.asStock.pluginInstanceKey;
            defers.push(
              registerPluginInstanceInternal(pluginId, key, newRtmNode, {
                defaultStaticConfiguration: stockTmpl.content,
              }),
            );
          }
          for (const key of knownMultitonInstances[pluginId] ?? []) {
            defers.push(
              registerPluginInstanceInternal(pluginId, key, newRtmNode, {}),
            );
          }

          break;
        }
        default:
          plugin satisfies never;
          throw new Error("unreachable!");
      }

      batch(() => {
        $runtimeTree({
          ...untrack(() => $runtimeTree()),
          [pluginId]: newRtmNode,
        });
        for (const defer of defers) {
          defer();
        }
      });
    }

    if (errors.length > 0) {
      return ["error", errors] as const;
    }
    return ["ok"];
  }

  function registerPluginInstanceInternal(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    newRtmNode: RuntimeTreeNode,
    opts: {
      defaultStaticConfiguration?: object;
      submittedStaticConfiguration?: object;
    },
  ) {
    persistentDataManager.initializeInstance(pluginId, instanceKey, {
      defaultStaticConfiguration: opts.defaultStaticConfiguration,
      submittedStaticConfiguration: opts.submittedStaticConfiguration,
    });

    const { context, changeStaticConfiguration, requestRefresh } =
      createContext(pluginId, instanceKey, {
        set$functionalitiesFor,
        set$statusFor,
      });

    const staticConfigurationChangeHandlerHandle = persistentDataManager
      .addInstanceStaticConfigurationChangeHandler(
        pluginId,
        instanceKey,
        changeStaticConfiguration,
      );

    if (instanceKey in newRtmNode.instances) {
      throw new Error("TODO: handle plugin instance key conflict.");
    }

    newRtmNode.instances[instanceKey] = {
      requestRefresh,
      dispose: async () => {
        throw new Error("TODO: implement `dispose` for plugin instances.");
        staticConfigurationChangeHandlerHandle.remove();
      },
    };

    return () => {
      set$statusFor(pluginId, instanceKey, newRtmNode.plugin.initialStatus);
      newRtmNode.plugin.entry(context);
    };
  }

  function newPluginInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: {
      submittedStaticConfiguration: object;
    },
  ) {
    const runtimeTree = untrack(() => $runtimeTree());
    const node = runtimeTree[pluginId];
    if (!node) {
      throw new Error(
        "TODO: handle attempts of creating an instance for an unregistered plugin.",
      );
    }
    if (node.plugin.type !== "plugin:multiton") {
      throw new Error(
        "TODO: handle attempts of creating an instance for a non-multiton plugin.",
      );
    }
    const defer = registerPluginInstanceInternal(
      pluginId,
      instanceKey,
      node,
      { submittedStaticConfiguration: opts.submittedStaticConfiguration },
    );
    batch(() => {
      $runtimeTree({
        ...untrack(() => $runtimeTree()),
        [pluginId]: node,
      });
      defer();
    });
  }

  function removePluginInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ) {
    const runtimeTree = untrack(() => $runtimeTree());
    const node = runtimeTree[pluginId];
    if (!node) {
      throw new Error(
        "TODO: handle attempts of removing an instance for an unregistered plugin.",
      );
    }
    if (node.plugin.type !== "plugin:multiton") {
      throw new Error(
        "TODO: handle attempts of removing an instance for a non-multiton plugin.",
      );
    }
    if (!(instanceKey in node.instances)) {
      throw new Error(
        "TODO: handle attempts of removing an non-existing instance.",
      );
    }

    batch(() => {
      $runtimeTree({
        ...runtimeTree,
        [pluginId]: {
          ...node,
          instances: _.omit(node.instances, [instanceKey]),
        },
      });
      persistentDataManager.removeInstance(pluginId, instanceKey);
    });
  }

  return {
    registerPlugin,
    newPluginInstance,
    removePluginInstance,
    $pluginIds,
    $infos,
    getPluginInstanceKeyRecommendationFor,
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

function getPluginInstancesKnownInDataFolder(): Record<
  PluginId,
  PluginInstanceKey[]
> {
  const knownList: //
    { pluginId: PluginId; pluginInstanceKey: PluginInstanceKey }[] = [];
  const badFqn: string[] = [];
  for (const entry of FS.readdirSync(DATA_PLUGIN_DATA_PATH)) {
    const RX = /^(.+)\.static-configuration\.json$/;
    const g = RX.exec(entry);
    if (!g) continue;
    const stem = g[1]!;
    const fqnResult = PluginInstanceFqn.safeParse(stem);
    if (!fqnResult.success) {
      badFqn.push(stem);
      continue;
    }
    const parts = tryExtractPartsFromPluginInstanceFqn(fqnResult.data);
    if (!parts) {
      badFqn.push(stem);
      continue;
    }
    knownList.push(parts);
  }
  if (badFqn.length) {
    console.error(
      "TODO: handle bad FQNs in the persistent data folder:",
      badFqn,
    );
  }

  return _.mapValues(
    Object.groupBy(knownList, (item) => item.pluginId),
    (items) => items!.map((item) => item.pluginInstanceKey),
  );
}

export { makePluginManager };
export type PluginManager = ReturnType<typeof makePluginManager>;
