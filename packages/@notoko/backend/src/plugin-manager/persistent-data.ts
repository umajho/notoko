import FS from "node:fs";

import { effect, signal } from "alien-signals";

import {
  DATA_PLUGIN_DATA_PATH,
  makePluginInstanceFqn,
  PluginId,
  PluginInstanceFqn,
  PluginInstanceKey,
} from "@notoko/definitions";
import { untrack } from "@notoko/utils/alien-signals";

interface Entry {
  $staticConfiguration: ReturnType<typeof signal<object>>;
  addStaticConfigurationChangeHandler: (
    cb: (config: object) => void,
  ) => { remove: () => void };
}

/**
 * TODO: provide a way to list ghost data files (files that belong to plugins
 * that have not been registered).
 */
export class PersistentDataManager {
  instances: Record<PluginInstanceFqn, Entry> = {};

  static #initializeInstance(
    Fqn: PluginInstanceFqn,
    opts: { defaultStaticConfiguration: object },
  ): Entry {
    const path = PersistentDataManager.#getStaticConfigurationFilePath(Fqn);

    let staticConfiguration: object | null = null;
    try {
      const data = FS.readFileSync(path, "utf-8");
      staticConfiguration = JSON.parse(data);
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      staticConfiguration = opts.defaultStaticConfiguration;
    }

    const $staticConfiguration = signal<object>(staticConfiguration!);
    const staticConfigurationChangeCallbacks = //
      new Set<(config: object) => void>();
    effect(() => {
      const staticConfig = $staticConfiguration();
      FS.writeFileSync(path, JSON.stringify(staticConfig), "utf-8");
      for (const cb of staticConfigurationChangeCallbacks) {
        cb(staticConfig);
      }
    });

    function addStaticConfigurationChangeHandler(
      cb: (config: object) => void,
    ) {
      staticConfigurationChangeCallbacks.add(cb);
      cb(untrack(() => $staticConfiguration()));
      return {
        remove: () => staticConfigurationChangeCallbacks.delete(cb),
      };
    }

    return { $staticConfiguration, addStaticConfigurationChangeHandler };
  }

  initializeInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: { defaultStaticConfiguration: object },
  ) {
    const Fqn = makePluginInstanceFqn(pluginId, instanceKey);
    if (Fqn in this.instances) {
      throw new Error("TODO: handle duplicate initialization.");
    }
    this.instances[Fqn] = PersistentDataManager.#initializeInstance(Fqn, opts);
  }

  /**
   * Note that the accessor is bound to the specific plugin instance. If the
   * instance is unregistered and another instance with the same Fqn is
   * registered later, the accessor will still point to the old instance.
   */
  getInstanceStaticConfigurationAccessor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): () => object {
    const Fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.instances[Fqn]!;
    return () => entry.$staticConfiguration();
  }

  addInstanceStaticConfigurationChangeHandler(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (config: object) => void,
  ): { remove: () => void } {
    const Fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.instances[Fqn]!;
    return entry.addStaticConfigurationChangeHandler(cb);
  }

  setInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    value: object,
  ) {
    const Fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.instances[Fqn]!;
    entry.$staticConfiguration(value);
  }

  static #getStaticConfigurationFilePath(
    Fqn: PluginInstanceFqn,
  ): string {
    return `${DATA_PLUGIN_DATA_PATH}/${Fqn}.static-configuration.json`;
  }
}
