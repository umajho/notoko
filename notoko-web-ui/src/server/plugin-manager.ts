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
  type PluginFunctionality,
  PluginFunctionalityAbsolutePath,
  PluginFunctionalityKey,
  type PluginNode,
  type PluginNodeContext,
  PluginNodeKey,
  type PluginNodeSingleton,
  type PluginNodeStatus,
  RootPluginNodeId,
} from "~/definitions";

interface RuntimeTreeNode {
  plugin: PluginNode;
  status: PluginNodeStatus;
  changeStaticConfiguration: (config: object) => void;
  requestRefresh: () => void;
  dispose: (untilChildrenDisposed: Promise<void>) => Promise<void>;
}

interface PersistentDataTreeNode {
  staticConfiguration: object;
  children: Record<PluginNodeKey, PersistentDataTreeNode>;
}

export type RegisterPluginErrorContent =
  | ["id_conflict", { conflictedId: RootPluginNodeId }]
  | ["bad_id", { id: string; error: z.ZodError }];

function makePluginManager() {
  const {
    set$staticConfiguration,
    getStaticConfigurationAccessor,
  } = createPersistentDataTrees();

  const [$runtimeTree, _set$runtimeTree] = //
    createStore<Record<RootPluginNodeId, RuntimeTreeNode>>({});
  const [$rootPluginNodeIds, set$rootPluginNodeIds] = //
    createSignal<RootPluginNodeId[]>([]);
  const set$runtimeTree = new Proxy(_set$runtimeTree, {
    apply: (target, thisArg, args) => {
      batch(() => {
        Reflect.apply(target, thisArg, args);
        set$rootPluginNodeIds(Object.keys($runtimeTree) as RootPluginNodeId[]);
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
    rootPluginMap: Record<RootPluginNodeId, PluginNode>,
  ): Promise<["ok"] | ["error", RegisterPluginErrorContent[]]> {
    const errors: RegisterPluginErrorContent[] = [];

    for (const [id, node] of Object.entries(rootPluginMap)) {
      if (id in $runtimeTree) throw new Error("TODO: handle id conflict.");
      switch (node.type) {
        case "plugin_node:singleton": {
          const idResult = RootPluginNodeId.safeParse(id);
          if (!idResult.success) {
            errors.push(["bad_id", { id, error: idResult.error }]);
            continue;
          }
          const rootPluginNodeId = idResult.data;
          const { context, changeStaticConfiguration, requestRefresh } =
            createContext(rootPluginNodeId, [], {
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
          set$runtimeTree(rootPluginNodeId, rtmNode);

          rtmNode.plugin.entry(context);

          const staticConfigurationAccessor =
            await getStaticConfigurationAccessor(
              rootPluginNodeId,
              [],
              node.defaultStaticConfiguration,
            );
          createEffect(on(
            staticConfigurationAccessor,
            (config) => rtmNode.changeStaticConfiguration(config),
          ));
          break;
        }
        case "plugin_node:multiton": {
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
    rootPluginNodeId: RootPluginNodeId,
    subPath: PluginNodeKey[],
  ): Accessor<PluginNode["info"] | null> {
    if (subPath.length > 0) {
      throw new Error(
        "TODO: implement `getInfoAccessor` when there is a subPath.",
      );
    }

    return createMemo(on(
      () => $runtimeTree,
      (tree) => {
        if (!(rootPluginNodeId in tree)) return null;
        return tree[rootPluginNodeId]!.plugin.info;
      },
    ));
  }

  return {
    registerPlugin,
    $rootPluginNodeIds,
    getInfoAccessor,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
    set$staticConfiguration,
    getStaticConfigurationAccessor,
  };
}

function createContext(
  rootPluginNodeId: RootPluginNodeId,
  subPath: PluginNodeKey[],
  opts: {
    set$runtimeTree: //
      SetStoreFunction<Record<RootPluginNodeId, RuntimeTreeNode>>;
    set$functionalities: Setter<
      Record<PluginFunctionalityAbsolutePath, PluginFunctionality>
    >;
  },
) {
  if (subPath.length > 0) {
    throw new Error("TODO: implement `createContext` when there is a subPath.");
  }

  let changeStaticConfigurationHandler:
    | ((config: object) => void)
    | null = null;
  let pendingStaticConfigurationChange: object | null = null;
  let requestRefreshHandler: (() => void) | null = null;
  let hasPendingRefreshRequest = false;
  const context: PluginNodeContext = {
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
    setStatus: (status: PluginNodeStatus) => {
      opts.set$runtimeTree(rootPluginNodeId, "status", status);
    },
    registerSingletonChildNode: (
      childPluginKey: PluginNodeKey,
      node: PluginNodeSingleton,
    ) => {
      throw new Error(
        "TODO: implement `registerSingletonChildNode` on `PluginNodeContext`.",
      );
    },
    setFunctionalities: (
      functionalities: Record<PluginFunctionalityKey, PluginFunctionality>,
    ) => {
      opts.set$functionalities((old) => {
        const prefix = rootPluginNodeId + "\0" + subPath.join("\0") + "\0";
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
 * - a function to list all chidren nodes (even ghost ones).
 */
function createPersistentDataTrees() {
  const trees: Record<
    RootPluginNodeId,
    ReturnType<typeof createSignal<PersistentDataTreeNode>>
  > = {};

  function makeDefaultPersistentDataTreeNode(opts: {
    defaultStaticConfiguration: object;
  }): PersistentDataTreeNode {
    return {
      staticConfiguration: opts.defaultStaticConfiguration,
      children: {},
    };
  }
  function makeLockName(id: RootPluginNodeId): string {
    return `notoko:plugin_persistent_data:${id}`;
  }
  function makeFilePath(id: RootPluginNodeId): string {
    return `${DATA_PLUGIN_DATA_PATH}/${id}.json`;
  }

  async function set$staticConfiguration(
    id: RootPluginNodeId,
    subPath: PluginNodeKey[],
    value: object,
  ) {
    navigator.locks.request(makeLockName(id), async () => {
      if (subPath.length > 0) {
        throw new Error(
          "TODO: implement `set$staticConfiguration` when there is a subPath.",
        );
      }

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
    id: RootPluginNodeId,
    subPath: PluginNodeKey[],
    defaultValue: object,
  ): Promise<Accessor<object>> {
    return await navigator.locks.request(makeLockName(id), async () => {
      if (subPath.length > 0) {
        throw new Error(
          "TODO: implement `getStaticConfigurationAccessor` when there is a subPath.",
        );
      }

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
