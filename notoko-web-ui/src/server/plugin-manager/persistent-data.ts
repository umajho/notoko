import FS from "node:fs";

import {
  type Accessor,
  batch,
  createSignal,
  type Setter,
  untrack,
} from "solid-js";

import {
  DATA_PLUGIN_DATA_PATH,
  makePluginInstanceFQN,
  PluginId,
  PluginInstanceFQN,
  PluginInstanceKey,
} from "~/definitions.mod";

interface Entry {
  $staticConfiguration: Accessor<object>;
  set$staticConfiguration: Setter<object>;
  addStaticConfigurationChangeHandler: (
    cb: (config: object) => void,
  ) => { remove: () => void };
}

/**
 * TODO: provide a way to list ghost data files (files that belong to plugins
 * that have not been registered).
 */
export class PersistentDataManager {
  instances: Record<PluginInstanceFQN, Entry> = {};

  static #initializeInstance(
    fqn: PluginInstanceFQN,
    opts: { defaultStaticConfiguration: object },
  ): Entry {
    const path = PersistentDataManager.#getStaticConfigurationFilePath(fqn);

    let staticConfiguration: object | null = null;
    try {
      const data = FS.readFileSync(path, "utf-8");
      staticConfiguration = JSON.parse(data);
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      staticConfiguration = opts.defaultStaticConfiguration;
    }

    const [$staticConfiguration, set$staticConfiguration_] = //
      createSignal<object>(staticConfiguration!);
    const staticConfigurationChangeCallbacks = //
      new Set<(config: object) => void>();

    const set$staticConfiguration = new Proxy(set$staticConfiguration_, {
      apply: (target, thisArg, args) => {
        FS.writeFileSync(path, JSON.stringify(args[0]), "utf-8");
        Reflect.apply(target, thisArg, args);
        for (const cb of staticConfigurationChangeCallbacks) {
          cb(args[0]);
        }
      },
    });

    function addStaticConfigurationChangeHandler(
      cb: (config: object) => void,
    ) {
      staticConfigurationChangeCallbacks.add(cb);
      cb(untrack($staticConfiguration));
      return {
        remove: () => staticConfigurationChangeCallbacks.delete(cb),
      };
    }

    return {
      $staticConfiguration,
      set$staticConfiguration,
      addStaticConfigurationChangeHandler,
    };
  }

  initializeInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: { defaultStaticConfiguration: object },
  ) {
    const fqn = makePluginInstanceFQN(pluginId, instanceKey);
    if (fqn in this.instances) {
      throw new Error("TODO: handle duplicate initialization.");
    }
    this.instances[fqn] = PersistentDataManager.#initializeInstance(fqn, opts);
  }

  /**
   * Note that the accessor is bound to the specific plugin instance. If the
   * instance is unregistered and another instance with the same FQN is
   * registered later, the accessor will still point to the old instance.
   */
  getInstanceStaticConfigurationAccessor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<object> {
    const fqn = makePluginInstanceFQN(pluginId, instanceKey);
    const entry = this.instances[fqn]!;
    return entry.$staticConfiguration;
  }

  addInstanceStaticConfigurationChangeHandler(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (config: object) => void,
  ): { remove: () => void } {
    const fqn = makePluginInstanceFQN(pluginId, instanceKey);
    const entry = this.instances[fqn]!;
    return entry.addStaticConfigurationChangeHandler(cb);
  }

  setInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    value: object,
  ) {
    const fqn = makePluginInstanceFQN(pluginId, instanceKey);
    const entry = this.instances[fqn]!;
    entry.set$staticConfiguration(value);
  }

  static #getStaticConfigurationFilePath(
    fqn: PluginInstanceFQN,
  ): string {
    return `${DATA_PLUGIN_DATA_PATH}/${fqn}.static-configuration.json`;
  }
}
