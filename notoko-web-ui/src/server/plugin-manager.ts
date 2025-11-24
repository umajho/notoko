import FSP from "node:fs/promises";

import * as z from "zod/v4";
import * as _ from "es-toolkit";

import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";

import {
  DATA_PLUGIN_DATA_PATH,
  type Plugin,
  type PluginContext,
  type PluginFunctionality,
  PluginFunctionalityAbsolutePath,
  PluginFunctionalityKey,
  PluginId,
  type PluginStatus,
} from "~/definitions";

/**
 * NOTE: `*TreeNode` and `*Tree` are historical names for the tree-based plugin
 * system I had conceived at first. They should just be called something like
 * `*MapEntry` and `*Map` now.
 */
interface RuntimeTreeNode {
  plugin: Plugin;
  status: PluginStatus;
  changeStaticConfiguration: (config: object) => void;
  requestRefresh: () => void;
  dispose: (untilChildrenDisposed: Promise<void>) => Promise<void>;
}

interface PersistentDataTreeNode {
  staticConfiguration: object;
}

export type RegisterPluginErrorContent =
  | ["id_conflict", { conflictedId: PluginId }]
  | ["bad_id", { id: string; error: z.ZodError }];

function makePluginManager() {
  const {
    set$staticConfiguration,
    getStaticConfigurationAccessor,
  } = createPersistentDataTrees();

  const [$runtimeTree, _set$runtimeTree] = //
    createStore<Record<PluginId, RuntimeTreeNode>>({});
  const [$pluginIds, set$pluginIds] = createSignal<PluginId[]>([]);
  const set$runtimeTree = new Proxy(_set$runtimeTree, {
    apply: (target, thisArg, args) => {
      batch(() => {
        Reflect.apply(target, thisArg, args);
        set$pluginIds(Object.keys($runtimeTree) as PluginId[]);
      });
    },
  });

  // clearly inefficient, but premature optimization is the root of all evil.
  const [$functionalities, set$functionalities] = createSignal<
    Record<PluginFunctionalityAbsolutePath, PluginFunctionality>
  >({});
  const $phonemizers = createMemo(on(
    $functionalities,
    (fs) => _.pickBy(fs, (x) => x.type === "plugin_functionality:phonemizer"),
  ));
  const $durationPredictors = createMemo(on(
    $functionalities,
    (fs) =>
      _.pickBy(fs, (x) => x.type === "plugin_functionality:duration_predictor"),
  ));
  const $prosodyGenerators = createMemo(on(
    $functionalities,
    (fs) =>
      _.pickBy(fs, (x) => x.type === "plugin_functionality:prosody_generator"),
  ));

  async function registerPlugin(
    pluginMap: Record<PluginId, Plugin>,
  ): Promise<["ok"] | ["error", RegisterPluginErrorContent[]]> {
    const errors: RegisterPluginErrorContent[] = [];

    for (const [id, node] of Object.entries(pluginMap)) {
      if (id in $runtimeTree) throw new Error("TODO: handle id conflict.");
      switch (node.type) {
        case "plugin:singleton": {
          const idResult = PluginId.safeParse(id);
          if (!idResult.success) {
            errors.push(["bad_id", { id, error: idResult.error }]);
            continue;
          }
          const pluginId = idResult.data;
          const { context, changeStaticConfiguration, requestRefresh } =
            createContext(pluginId, {
              set$runtimeTree,
              set$functionalities,
            });
          const rtmNode: RuntimeTreeNode = {
            plugin: node,
            status: node.initialStatus,
            changeStaticConfiguration,
            requestRefresh,
            dispose: (untilChildrenDisposed: Promise<void>) => {
              throw new Error(
                "TODO: implement `dispose` for `RuntimeTreeNode`.",
              );
            },
          };
          set$runtimeTree(pluginId, rtmNode);

          rtmNode.plugin.entry(context);

          const staticConfigurationAccessor =
            await getStaticConfigurationAccessor(
              pluginId,
              node.defaultStaticConfiguration,
            );
          createEffect(on(
            staticConfigurationAccessor,
            (config) => rtmNode.changeStaticConfiguration(config),
          ));
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

  function getInfoAccessor(
    pluginId: PluginId,
  ): Accessor<Plugin["info"] | null> {
    return createMemo(on(
      () => $runtimeTree,
      (tree) => {
        if (!(pluginId in tree)) return null;
        return tree[pluginId]!.plugin.info;
      },
    ));
  }

  return {
    registerPlugin,
    $pluginIds,
    getInfoAccessor,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
    set$staticConfiguration,
    getStaticConfigurationAccessor,
  };
}

function createContext(pluginId: PluginId, opts: {
  set$runtimeTree: //
    SetStoreFunction<Record<PluginId, RuntimeTreeNode>>;
  set$functionalities: Setter<
    Record<PluginFunctionalityAbsolutePath, PluginFunctionality>
  >;
}) {
  let changeStaticConfigurationHandler:
    | ((config: object) => void)
    | null = null;
  let pendingStaticConfigurationChange: object | null = null;
  let requestRefreshHandler: (() => void) | null = null;
  let hasPendingRefreshRequest = false;
  const context: PluginContext = {
    set onChangeStaticConfiguration(
      handler: (config: object) => void,
    ) {
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
      handler: (
        untilChildrenAreDisposed: Promise<void>,
      ) => Promise<void>,
    ) {
      throw new Error(
        "TODO: implement `set onDispose` on `PluginNodeContext`.",
      );
    },
    setStatus: (status: PluginStatus) => {
      opts.set$runtimeTree(pluginId, "status", status);
    },
    setFunctionalities: (
      functionalities: Record<PluginFunctionalityKey, PluginFunctionality>,
    ) => {
      opts.set$functionalities((old) => {
        const prefix = pluginId + "\0";
        const entries = Object.entries(old)
          .filter(([key, _]) => !key.startsWith(prefix));
        for (const [newKey, newF] of Object.entries(functionalities)) {
          const newAbsolutePath = prefix + newKey;
          entries.push([newAbsolutePath, newF]);
        }
        return Object.fromEntries(entries);
      });
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

/**
 * TODO:
 * - a function to list all plugin data (even ghost ones).
 * - ~~a function to list all chidren nodes (even ghost ones).~~
 */
function createPersistentDataTrees() {
  const trees: Record<
    PluginId,
    ReturnType<typeof createSignal<PersistentDataTreeNode>>
  > = {};

  function makeDefaultPersistentDataTreeNode(opts: {
    defaultStaticConfiguration: object;
  }): PersistentDataTreeNode {
    return {
      staticConfiguration: opts.defaultStaticConfiguration,
    };
  }
  function makeLockName(id: PluginId): string {
    return `notoko:plugin_persistent_data:${id}`;
  }
  function makeFilePath(id: PluginId): string {
    return `${DATA_PLUGIN_DATA_PATH}/${id}.json`;
  }

  async function set$staticConfiguration(
    id: PluginId,
    value: object,
  ) {
    navigator.locks.request(makeLockName(id), async () => {
      // `getStaticConfigurationAccessor` should always be called before this,
      // so the tree must exist.
      if (!(id in trees)) throw new Error("unreachable!");

      const newNode: PersistentDataTreeNode = {
        ...trees[id]![0](),
        staticConfiguration: value,
      };

      const dataJson = JSON.stringify(newNode);
      await FSP.writeFile(makeFilePath(id), dataJson, "utf-8");

      if (id in trees) {
        trees[id]![1](newNode);
      } else {
        trees[id] = createSignal<PersistentDataTreeNode>(newNode);
      }
    });
  }

  async function getStaticConfigurationAccessor(
    id: PluginId,
    defaultValue: object,
  ): Promise<Accessor<object>> {
    return await navigator.locks.request(makeLockName(id), async () => {
      if (id in trees) return trees[id]![0];

      const data = await (async (): Promise<PersistentDataTreeNode> => {
        try {
          return JSON.parse(await FSP.readFile(makeFilePath(id), "utf-8"));
        } catch (e) {
          if (e instanceof Error) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
              return makeDefaultPersistentDataTreeNode({
                defaultStaticConfiguration: defaultValue,
              });
            }
          }
          throw e;
        }
      })();

      const signal = createSignal<PersistentDataTreeNode>(data);
      trees[id] = signal;
      return signal[0];
    });
  }

  return {
    set$staticConfiguration,
    getStaticConfigurationAccessor,
  };
}

/**
 * XXX: I don't know why, but if I store the singleton in a module-level
 * variable, the instance returned by this function becomes different between
 * `entry-server.tsx` and other places.
 */
export function getPluginManagerSingleton(): PluginManager {
  // @ts-ignore
  return globalThis.pluginManagerSingleton ??= makePluginManager();
}

export type PluginManager = ReturnType<typeof makePluginManager>;
