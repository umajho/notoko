import FS from "node:fs";

import { effect, signal } from "alien-signals";

import { readPotentialFileAsUtf8Sync } from "@notoko/utils/fs";

import {
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
  #pluginDataPath: string;

  constructor(opts: {
    pluginDataPath: string;
  }) {
    this.#pluginDataPath = opts.pluginDataPath;
  }

  #instances: Record<PluginInstanceFqn, Entry> = {};

  static #initializeInstance(
    opts: {
      staticConfigurationFilePath: string;
      defaultStaticConfiguration?: object;
      submittedStaticConfiguration?: object;
    },
  ): Entry {
    const staticConfig = ((): object => {
      let text = readPotentialFileAsUtf8Sync(opts.staticConfigurationFilePath);
      if (text) {
        if (opts.submittedStaticConfiguration) {
          throw new Error(
            "TODO: handle attempts of creating an instance that already exists.",
          );
        }
        return JSON.parse(text);
      }

      if (opts.submittedStaticConfiguration) {
        text = JSON.stringify(opts.submittedStaticConfiguration);
        FS.writeFileSync(opts.staticConfigurationFilePath, text, "utf-8");
        return opts.submittedStaticConfiguration;
      } else if (!opts.defaultStaticConfiguration) {
        throw new Error(
          "TODO: handle missing static configuration with no default.",
        );
      }
      return opts.defaultStaticConfiguration;
    })();

    const $staticConfiguration = signal<object>(staticConfig!);
    const staticConfigurationChangeCallbacks = //
      new Set<(config: object) => void>();
    const disposeEffect = effect(() => {
      const staticConfig = $staticConfiguration();
      const json = JSON.stringify(staticConfig);
      FS.writeFileSync(opts.staticConfigurationFilePath, json, "utf-8");
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
    if (fqn in this.#instances) {
      throw new Error("TODO: handle duplicate initialization.");
    }
    this.#instances[fqn] = PersistentDataManager.#initializeInstance({
      ...opts,
      staticConfigurationFilePath: this.#getStaticConfigurationFilePath(fqn),
    });
  }

  /**
   * TODO: notify subscribers about the removal?
   */
  removeInstance(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ) {
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const path = this.#getStaticConfigurationFilePath(fqn);
    const instance = this.#instances[fqn];
    if (!instance) {
      throw new Error("TODO: handle removal of non-existing instance.");
    }
    instance.disposeEffect();
    delete this.#instances[fqn];
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
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.#instances[fqn];
    if (!entry) return null;
    return () => entry.$staticConfiguration();
  }

  addInstanceStaticConfigurationChangeHandler(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    cb: (config: object) => void,
  ): { remove: () => void } {
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.#instances[fqn]!;
    return entry.addStaticConfigurationChangeHandler(cb);
  }

  setInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
    value: object,
  ) {
    const fqn = makePluginInstanceFqn(pluginId, instanceKey);
    const entry = this.#instances[fqn]!;
    entry.$staticConfiguration(value);
  }

  #getStaticConfigurationFilePath(
    fqn: PluginInstanceFqn,
  ): string {
    return `${this.#pluginDataPath}/${fqn}.static-configuration.json`;
  }
}
