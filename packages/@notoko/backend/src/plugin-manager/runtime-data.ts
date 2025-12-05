import * as _ from "es-toolkit";

import { computed, effect, signal } from "alien-signals";

import {
  type Functionality,
  FunctionalityFqn,
  makePluginInstanceFqn,
  type Plugin,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  type PluginStatus,
} from "@notoko/definitions";
import { urlEncodeToSafePathSegment } from "@notoko/utils/path-segment-url-encoding";
import { untrack } from "@notoko/utils/alien-signals";

/**
 * NOTE: `*TreeNode` and `*Tree` are historical names for the tree-based plugin
 * system I had conceived at first. They should just be called something like
 * `*MapEntry` and `*Map` now.
 */
export interface RuntimeTreeNode {
  plugin: Plugin;
  instances: Record<
    PluginInstanceKey,
    { requestRefresh: () => void; dispose: () => Promise<void> }
  >;
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
  const $runtimeTree = signal<Record<PluginId, RuntimeTreeNode>>({});
  const $pluginIds = signal<PluginId[]>([]);
  const $infos = signal<Record<PluginId, Plugin["info"]>>({});
  const $instanceKeys = //
    signal<Record<PluginId, null | PluginInstanceKey[]>>({});
  effect(() => {
    const runtimeTree = $runtimeTree();

    const newPluginIds = new Set<PluginId>();
    const newInfos: Record<PluginId, Plugin["info"]> = {};
    const newInstances: Record<PluginId, null | PluginInstanceKey[]> = {};
    for (const [pluginId_, node] of Object.entries(runtimeTree)) {
      const pluginId = pluginId_ as PluginId;

      newPluginIds.add(pluginId);
      newInfos[pluginId] = node.plugin.info;
      switch (node.plugin.type) {
        case "plugin:singleton":
          newInstances[pluginId] = null;
          break;
        case "plugin:multiton":
          const arr = (newInstances[pluginId] = [] as PluginInstanceKey[]);
          for (const instanceKey of Object.keys(node.instances)) {
            arr.push(instanceKey as PluginInstanceKey);
          }
          break;
        default:
          node.plugin satisfies never;
          throw new Error("unreachable!");
      }
    }
    $pluginIds(Array.from(newPluginIds));
    $infos(newInfos);
    $instanceKeys(newInstances);
  });

  function getPluginInstanceKeyRecommendationFor(
    pluginId: PluginId,
    config: object,
  ): ["ok", PluginInstanceKey | null] | "unavailable" {
    const runtimeTree = untrack(() => $runtimeTree());
    const node = runtimeTree[pluginId];
    if (!node) return "unavailable";
    if (node.plugin.type !== "plugin:multiton") return "unavailable";
    if (!node.plugin.handlers.recommendPluginInstanceKey) return "unavailable";
    return ["ok", node.plugin.handlers.recommendPluginInstanceKey(config)];
  }

  const $instanceStatusMap = signal<Record<string, PluginStatus>>({});
  function set$statusFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    status: PluginStatus,
  ) {
    const prefix = makePluginInstanceFqn(pluginId, instanceKey);
    $instanceStatusMap({
      ...untrack(() => $instanceStatusMap()),
      [prefix]: status,
    });
  }
  function getStatusAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): () => PluginStatus | "unknown" {
    const prefix = makePluginInstanceFqn(pluginId, instanceKey);
    return computed(() => {
      const map = $instanceStatusMap();
      return map[prefix] ?? "unknown";
    });
  }

  const $functionalities = signal<Record<string, Functionality>>({});
  const $phonemizers = computed(() =>
    _.pickBy($functionalities(), (x) => x.type === "functionality:phonemizer")
  );
  const $durationPredictors = computed(() =>
    _.pickBy(
      $functionalities(),
      (x) => x.type === "functionality:duration_predictor",
    )
  );
  const $prosodyGenerators = computed(() =>
    _.pickBy(
      $functionalities(),
      (x) => x.type === "functionality:prosody_generator",
    )
  );

  function set$functionalitiesFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    functionalities: Record<PluginInstanceFunctionalityKey, Functionality>,
  ) {
    const old = untrack(() => $functionalities());

    const prefix = makePluginInstanceFqn(pluginId, instanceKey);
    const entries = Object.entries(old)
      .filter(([key, _]) => !key.startsWith(prefix));
    for (const [newKey, newF] of Object.entries(functionalities)) {
      const newAbsolutePath = //
        `${prefix}[${urlEncodeToSafePathSegment(newKey)}]`;
      entries.push([newAbsolutePath, newF]);
    }

    $functionalities(Object.fromEntries(entries));
  }
  function getFunctionalitiesAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): () => [FunctionalityFqn, Functionality][] {
    const prefix = makePluginInstanceFqn(pluginId, instanceKey);
    return computed(() => {
      let fs = $functionalities();
      // no idea why the return type of `_.pickBy` become
      // `Record<……, …… | undefined>`.
      fs = _.pickBy(fs, (_, key) => key.startsWith(prefix)) as //
      Record<FunctionalityFqn, Functionality>;
      return Object.entries(fs) as [FunctionalityFqn, Functionality][];
    });
  }
  function getFunctionalityInfosAccessorFor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): () => [FunctionalityFqn, Functionality["info"]][] {
    return computed(() => {
      const f = getFunctionalitiesAccessorFor(pluginId, instanceKey);
      return f().map(([p, f]) => [p, f.info]);
    });
  }
  function getFunctionalityAccessorFor(
    fqn: FunctionalityFqn,
  ): () => Functionality | null {
    return computed(() => {
      const fs = $functionalities();
      return fs[fqn] ?? null;
    });
  }

  return {
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
    $functionalities,
    $phonemizers,
    $durationPredictors,
    $prosodyGenerators,
  };
}
