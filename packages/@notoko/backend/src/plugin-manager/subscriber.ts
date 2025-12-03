import { effect } from "alien-signals";

import type {
  Functionality,
  FunctionalityFqn,
  Plugin,
  PluginId,
  PluginInstanceKey,
  PluginStatus,
} from "@notoko/definitions";

import type { PluginManager } from "../plugin-manager.mod";
import { batch } from "@notoko/utils/alien-signals";

export class Subscriber {
  #subscriptions: Record<string, { dispose: () => void }> = {};
  #m: PluginManager;

  constructor(m: PluginManager) {
    this.#m = m;
  }

  #subscribe<T>(
    topicPath: string[],
    accessor: () => T,
    cb: (v: T) => void,
    opts: { metadata: any },
  ) {
    const topicKey = JSON.stringify(topicPath);
    if (topicKey in this.#subscriptions) {
      console.warn("subscribe: already subscribed!", {
        module: "PluginManager",
        topicPath: topicPath,
        metadata: opts.metadata,
      });
      return;
    }

    const dispose = effect(() => cb(accessor()));

    this.#subscriptions[topicKey] = { dispose };
  }

  #unsubscribe(topicPath: string[], opts: { metadata: any }) {
    const topicKey = JSON.stringify(topicPath);
    const sub = this.#subscriptions[topicKey];
    if (!sub) {
      console.warn("unsubscribe: no such subscription!", {
        module: "PluginManager",
        topicPath: topicPath,
        metadata: opts.metadata,
      });
      return;
    }
    sub.dispose();
    delete this.#subscriptions[topicKey];
  }

  countSubscriptions() {
    return Object.keys(this.#subscriptions).length;
  }

  dispose() {
    batch(() => { // I don't know if `batch` helps here though.
      for (const sub of Object.values(this.#subscriptions)) {
        sub.dispose();
      }
    });
  }

  subscribePluginIds(
    cb: (v: PluginId[]) => void,
    opts: { metadata: any },
  ) {
    this.#subscribe(["pluginIds"], () => this.#m.$pluginIds(), cb, opts);
  }
  unsubscribePluginIds(opts: { metadata: any }) {
    this.#unsubscribe(["pluginIds"], opts);
  }

  subscribePluginInfo(
    pluginId: PluginId,
    cb: (v: Plugin["info"] | "not_found") => void,
    opts: { metadata: any },
  ) {
    const path = ["pluginInfo", pluginId];
    this.#subscribe(
      path,
      () => this.#m.$infos()[pluginId] ?? "not_found",
      cb,
      opts,
    );
  }
  unsubscribePluginInfo(
    pluginId: PluginId,
    opts: { metadata: any },
  ) {
    this.#unsubscribe(["pluginInfo", pluginId], opts);
  }

  subscribePluginInstanceKeys(
    pluginId: PluginId,
    cb: (v: PluginInstanceKey[] | null) => void,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceKeys", pluginId];
    this.#subscribe(
      path,
      () => this.#m.$instanceKeys()[pluginId] ?? null,
      cb,
      opts,
    );
  }
  unsubscribePluginInstanceKeys(
    pluginId: PluginId,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceKeys", pluginId];
    this.#unsubscribe(path, opts);
  }

  subscribePluginInstanceStatus(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (v: PluginStatus | "unknown") => void,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceStatus", pluginId, instanceKey];
    const $a = this.#m.getStatusAccessorFor(pluginId, instanceKey);
    this.#subscribe(path, () => $a(), cb, opts);
  }
  unsubscribePluginInstanceStatus(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceStatus", pluginId, instanceKey];
    this.#unsubscribe(path, opts);
  }

  subscribePluginInstanceFunctionalityInfos(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (v: [FunctionalityFqn, Functionality["info"]][]) => void,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceFunctionalityInfos", pluginId, instanceKey];
    const $a = this.#m.getFunctionalityInfosAccessorFor(pluginId, instanceKey);
    this.#subscribe(path, () => $a(), cb, opts);
  }
  unsubscribePluginInstanceFunctionalityInfos(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceFunctionalityInfos", pluginId, instanceKey];
    this.#unsubscribe(path, opts);
  }

  subscribePluginInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (v: object) => void,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceStaticConfiguration", pluginId, instanceKey];
    const $a = this.#m.getStaticConfigurationAccessorFor(pluginId, instanceKey);
    this.#subscribe(path, () => $a(), cb, opts);
  }
  unsubscribePluginInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: { metadata: any },
  ) {
    const path = ["pluginInstanceStaticConfiguration", pluginId, instanceKey];
    this.#unsubscribe(path, opts);
  }

  subscribeFunctionalityInfo(
    functionalityFqn: FunctionalityFqn,
    cb: (v: Functionality["info"] | "not_found") => void,
    opts: { metadata: any },
  ) {
    const path = ["functionalityInfo", functionalityFqn];
    const $a = this.#m.getFunctionalityAccessorFor(functionalityFqn);
    this.#subscribe(path, () => $a()?.info ?? "not_found", cb, opts);
  }
  unsubscribeFunctionalityInfo(
    functionalityFqn: FunctionalityFqn,
    opts: { metadata: any },
  ) {
    const path = ["functionalityInfo", functionalityFqn];
    this.#unsubscribe(path, opts);
  }
}
