import * as _ from "es-toolkit";

import {
  type Component,
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
} from "solid-js";
import { createAsync, useAction } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { Title } from "@solidjs/meta";

import { cls } from "~/utils/cls";
import { makeTitle } from "~/utils/titles";
import {
  makePluginInstanceFqn,
  type Plugin,
  PluginId,
  PluginInstanceKey,
  SINGLETON_PLUGIN_INSTANCE_KEY,
} from "~/definitions.mod";
import { bothNonNull, stringToNull } from "~/utils/misc";
import {
  getPluginInfo,
  getPluginInstanceStaticConfiguration,
  getPluginInstanceStatus,
  setPluginInstanceStaticConfigurationAction,
} from "~/client-server-bridge/plugin-manager";
import { useRuntimePagePluginsTabParams } from "~/routes/runtime/plugins";
import { LoadingSpan } from "~/components/ui/rudimentary";
import {
  JsonForms,
  JsonFormsLiteEx,
} from "~/components/web-components/JsonForms";

export default (() => {
  const {
    $selectedPluginId,
    $selectedPluginInstanceKey,
  } = useRuntimePagePluginsTabParams();

  return (
    <>
      <Title>{makeTitle("Plugin Instance: …")}</Title>

      <main class="prose container mx-auto">
        <Show
          when={bothNonNull($selectedPluginId(), $selectedPluginInstanceKey())}
        >
          {(both) => (
            <MainContent
              pluginId={both()[0]}
              pluginInstanceKey={both()[1]}
            />
          )}
        </Show>
      </main>
    </>
  );
}) satisfies Component<{}>;

const MainContent: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
}> = ($props) => {
  const $info = createAsync<Plugin["info"] | "not_found" | "loading">(
    () => getPluginInfo($props.pluginId),
    { initialValue: "loading" },
  );

  return (
    <Switch>
      <Match when={$info() === "loading"}>
        TODO: LOADING
      </Match>
      <Match when={$info() === "not_found"}>
        TODO: NOT FOUND
      </Match>
      <Match when={stringToNull($info())}>
        {($info) => (
          <MainContentReady
            pluginId={$props.pluginId}
            pluginInstanceKey={$props.pluginInstanceKey}
            info={$info()}
          />
        )}
      </Match>
    </Switch>
  );
};

const MainContentReady: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
  info: Plugin["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const $fqn = createMemo(() =>
    makePluginInstanceFqn($props.pluginId, $props.pluginInstanceKey)
  );

  const $status = createAsync(
    () =>
      getPluginInstanceStatus($props.pluginId, SINGLETON_PLUGIN_INSTANCE_KEY),
    { initialValue: "unknown" },
  );

  const $staticConfigJsonSchema = createMemo(() => {
    const tuple = $props.info.staticConfigurationSchema;
    if (!tuple) return {};
    switch (tuple[0]) {
      case "json_schema":
        return tuple[1];
      default:
        tuple[0] satisfies never;
        throw new Error("unreachable!");
    }
  });
  const $staticConfigData = createAsync(
    () =>
      getPluginInstanceStaticConfiguration(
        $props.pluginId,
        SINGLETON_PLUGIN_INSTANCE_KEY,
      ),
    { initialValue: null },
  );

  const [$hasUnsavedStaticConfigChanges, set$hasUnsavedStaticConfigChanges] =
    createSignal(false);

  const setPluginInstanceStaticConfiguration = //
    useAction(setPluginInstanceStaticConfigurationAction);

  /**
   * TODO: The actual flow should be:
   * - call `tryUpdatePluginInstanceStaticConfiguration`.
   *   - the relevant plugin validates the new data.
   * - if it returned `["ok"]`, then `set$hasUnsavedChanges(false)`.
   *   - otherwise, we should display the error message given by the plugin.
   */
  function handleSubmitStaticConfig(data: any) {
    setPluginInstanceStaticConfiguration(
      $props.pluginId,
      SINGLETON_PLUGIN_INSTANCE_KEY,
      data,
    );
  }

  return (
    <>
      <Title>
        {makeTitle(`Plugin Instance: ${$props.info.shownName} [ … ]`)}
      </Title>
      <h1>{$props.info.shownName}</h1>
      <span>
        Status: {$status()} | FQN: <code>{$fqn()}</code>
      </span>
      <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
        <div class="card-body">
          <h2 class="card-title">
            Static Configuration
            <Show when={$hasUnsavedStaticConfigChanges()}>
              <span class="italic text-sm">(*unsaved changes)</span>
            </Show>
          </h2>
          <Show
            when={bothNonNull($staticConfigJsonSchema(), $staticConfigData())}
            fallback={<LoadingSpan class="mx-auto" size="xl" />}
          >
            {($both) => (
              <JsonFormsLiteEx
                data={$both()[1]}
                onSubmit={handleSubmitStaticConfig}
                setHasUnsavedChanges={set$hasUnsavedStaticConfigChanges}
                schema={$both()[0]}
              />
            )}
          </Show>
        </div>
      </div>
    </>
  );
};
