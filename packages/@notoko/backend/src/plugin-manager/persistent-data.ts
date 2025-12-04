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
  disposeEffect: () => void;
}

/**
 * TODO: provide a way to list ghost data files (files that belong to plugins
 * that have not been registered).
 */
export class PersistentDataManager {
  instances: Record<PluginInstanceFqn, Entry> = {};

  static #initializeInstance(
    fqn: PluginInstanceFqn,
    opts: {
      defaultStaticConfiguration?: object;
      submittedStaticConfiguration?: object;
    },
  ): Entry {
    const path = PersistentDataManager.#getStaticConfigurationFilePath(fqn);

    const staticConfig = ((): object => {
      try {
        const data = FS.readFileSync(path, "utf-8");
        if (opts.submittedStaticConfiguration) {
          throw new Error(
            "TODO: handle attempts of creating an instance that already exists.",
          );
        }
        return JSON.parse(data);
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        if (opts.submittedStaticConfiguration) {
          const json = JSON.stringify(opts.submittedStaticConfiguration);
          FS.writeFileSync(path, json, "utf-8");
          return opts.submittedStaticConfiguration;
        } else {
          if (!opts.defaultStaticConfiguration) {
            throw new Error(
              "TODO: handle missing static configuration with no default.",
            );
          }
          return opts.defaultStaticConfiguration;
        }
      }
    })();

    const $staticConfiguration = signal<object>(staticConfig!);
    const staticConfigurationChangeCallbacks = //
      new Set<(config: object) => void>();
    const disposeEffect = effect(() => {
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

    return {
      $staticConfiguration,
      addStaticConfigurationChangeHandler,
      disposeEffect,
    };
  }

  initializeInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    opts: {
      defaultStaticConfiguration?: object;
      submittedStaticConfiguration?: object;
    },
  ) {
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    if (fqn in this.instances) {
      throw new Error("TODO: handle duplicate initialization.");
    }
    this.instances[fqn] = PersistentDataManager.#initializeInstance(fqn, opts);
  }

  /**
   * TODO: notify subscribers about the removal?
   */
  removeInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ) {
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const path = PersistentDataManager.#getStaticConfigurationFilePath(fqn);
    const instance = this.instances[fqn];
    if (!instance) {
      throw new Error("TODO: handle removal of non-existing instance.");
    }
    instance.disposeEffect();
    delete this.instances[fqn];
    FS.unlinkSync(path);
  }

  /**
   * Note that the accessor is bound to the specific plugin instance. If the
   * instance is unregistered and another instance with the same Fqn is
   * registered later, the accessor will still point to the old instance.
   */
  getInstanceStaticConfigurationAccessor(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): (() => object) | null {
    const Fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.instances[Fqn];
    if (!entry) return null;
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
