import * as _ from "es-toolkit";

import { type Accessor, batch, createMemo, createSignal, on } from "solid-js";
import { createStore } from "solid-js/store";

import {
  type Functionality,
  FunctionalityFQN,
  type Plugin,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  type PluginStatus,
} from "~/definitions.mod";

/**
 * NOTE: `*TreeNode` and `*Tree` are historical names for the tree-based plugin
 * system I had conceived at first. They should just be called something like
 * `*MapEntry` and `*Map` now.
 */
export interface RuntimeTreeNode {
  plugin: Plugin;
  requestRefresh: () => void;
  dispose: (untilChildrenDisposed: Promise<void>) => Promise<void>;
}

/**
 * FIXME: This definitely will not work well on large scale:
 * - every time the runtime tree is changed, all the signals whose data are
 *   derived from the tree will also be updated.
 * - every time a plugin sets its functionalities, accessors of all the plugins
 *   will also be updated.
 *
 * Though, the scalability is not a big concern for now, and it is said that
 * premature optimization is the root of all evil.
 */
export function createRuntimeData() {
  const [$runtimeTree, set$runtimeTree_] = //
    createStore<Record<PluginId, RuntimeTreeNode>>({});
  const [$pluginIds, set$pluginIds] = createSignal<PluginId[]>([]);
  const [$infos, set$infos] = //
    createSignal<Record<PluginId, Plugin["info"]>>({});
  const [$instanceKeys, set$instanceKeys] = //
    createSignal<Record<PluginId, null | PluginInstanceKey[]>>({});
  const set$runtimeTree = new Proxy(set$runtimeTree_, {
    apply: (target, thisArg, args) => {
      batch(() => {
        Reflect.apply(target, thisArg, args);

        set$pluginIds(Object.keys($runtimeTree) as PluginId[]);

        const newInfos: Record<PluginId, Plugin["info"]> = {};
        const newInstances: Record<PluginId, null | PluginInstanceKey[]> = {};
        for (const [id_, node] of Object.entries($runtimeTree)) {
          const id = id_ as PluginId;
          newInfos[id] = node.plugin.info;
          switch (node.plugin.type) {
            case "plugin:singleton":
              newInstances[id] = null;
              break;
            case "plugin:multiton":
              throw new Error("TODO: implement multiton instances listing.");
            default:
              node!.plugin satisfies never;
              throw new Error("unreachable!");
          }
        }
        set$infos(newInfos);
        set$instanceKeys(newInstances);
      });
    },
  });

  const [$instanceStatusMap, set$instanceStatusMap] = //
    createSignal<Record<string, PluginStatus>>({});
  function set$statusFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    status: PluginStatus,
  ) {
    const prefix = makePrefix(pluginId, instanceKey);
    set$instanceStatusMap((old) => ({ ...old, [prefix]: status }));
  }
  function getStatusAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<PluginStatus | "unknown"> {
    const prefix = makePrefix(pluginId, instanceKey);
    return createMemo(() => {
      const map = $instanceStatusMap();
      return map[prefix] ?? "unknown";
    });
  }

  const [$functionalities, set$functionalities] = createSignal<
    Record<string, Functionality>
  >({});
  const $phonemizers = createMemo(on(
    $functionalities,
    (fs) => _.pickBy(fs, (x) => x.type === "functionality:phonemizer"),
  ));
  const $durationPredictors = createMemo(on(
    $functionalities,
    (fs) => _.pickBy(fs, (x) => x.type === "functionality:duration_predictor"),
  ));
  const $prosodyGenerators = createMemo(on(
    $functionalities,
    (fs) => _.pickBy(fs, (x) => x.type === "functionality:prosody_generator"),
  ));

  function makePrefix(pluginId: PluginId, instanceKey: PluginInstanceKey) {
    return pluginId + "\0" + instanceKey + "\0";
  }

  function set$functionalitiesFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    functionalities: Record<
      PluginInstanceFunctionalityKey,
      Functionality
    >,
  ) {
    set$functionalities((old) => {
      const prefix = makePrefix(pluginId, instanceKey);
      const entries = Object.entries(old)
        .filter(([key, _]) => !key.startsWith(prefix));
      for (const [newKey, newF] of Object.entries(functionalities)) {
        const newAbsolutePath = prefix + newKey;
        entries.push([newAbsolutePath, newF]);
      }
      return Object.fromEntries(entries);
    });
  }
  function getFunctionalitiesAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<[FunctionalityFQN, Functionality][]> {
    const prefix = makePrefix(pluginId, instanceKey);
    return createMemo(on(
      $functionalities,
      (fs) => {
        // no idea why the return type of `_.pickBy` become
        // `Record<……, …… | undefined>`.
        fs = _.pickBy(fs, (_, key) => key.startsWith(prefix)) as //
        Record<FunctionalityFQN, Functionality>;
        return Object.entries(fs) as [FunctionalityFQN, Functionality][];
      },
    ));
  }
  function getFunctionalityInfosAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<
    [FunctionalityFQN, Functionality["info"]][]
  > {
    return createMemo(() => {
      const f = getFunctionalitiesAccessorFor(pluginId, instanceKey);
      return f().map(([p, f]) => [p, f.info]);
    });
  }

  return {
    $runtimeTree,
    set$runtimeTree,
    $pluginIds,
    $infos,
    $instanceKeys,
    set$statusFor,
    getStatusAccessorFor,
    set$functionalitiesFor,
    getFunctionalityInfosAccessorFor,
    $functionalities,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
  };
}
