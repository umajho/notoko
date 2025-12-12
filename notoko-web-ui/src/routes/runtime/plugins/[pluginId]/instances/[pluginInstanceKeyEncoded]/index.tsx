import {
  type Component,
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
} from "solid-js";
import { useAction } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { Title } from "@solidjs/meta";
import { VsTrash } from "solid-icons/vs";

import {
  makePluginInstanceFqn,
  type Plugin,
  PluginId,
  type PluginInfo,
  PluginInstanceKey,
} from "@notoko/definitions";

import { Jsfe } from "~/components/web-components/Jsfe";
import { cls } from "~/utils/cls";
import { makeTitle } from "~/utils/titles";
import { bothNonNull, stringToNull } from "~/utils/misc";
import { useRuntimePagePluginsTabParams } from "~/utils/routing";
import { LoadingSpan } from "~/components/ui/rudimentary";
import { getLiveQueryingClientSingleton } from "~/client/singletons";
import {
  removePluginInstanceAction,
  setPluginInstanceStaticConfigurationAction,
} from "~/client/actions";

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
  const lqClient = getLiveQueryingClientSingleton();
  const $info = createMemo(() => lqClient.queryPluginInfo($props.pluginId)());

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
  info: PluginInfo;
}> = ($props) => {
  const $prefersDark = usePrefersDark();
  const lqClient = getLiveQueryingClientSingleton();

  const $fqn = createMemo(() =>
    makePluginInstanceFqn($props.pluginId, $props.pluginInstanceKey)
  );

  const $status = createMemo(() =>
    lqClient.queryPluginInstanceStatus(
      $props.pluginId,
      $props.pluginInstanceKey,
    )()
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
  const $staticConfigData = createMemo(() =>
    lqClient.queryPluginInstanceStaticConfiguration(
      $props.pluginId,
      $props.pluginInstanceKey,
    )()
  );

  const [$hasUnsavedChanges, set$hasUnsavedChanges] = createSignal(false);
  function handleChangeStaticConfig(newData: any) {
    set$hasUnsavedChanges(true);
  }

  const removePluginInstance = useAction(removePluginInstanceAction);

  async function handleRemove() {
    await removePluginInstance($props.pluginId, $props.pluginInstanceKey);
    window.location.href = `/runtime/plugins`;
  }

  const setPluginInstanceStaticConfiguration = //
    useAction(setPluginInstanceStaticConfigurationAction);

  /**
   * TODO: The actual flow should be:
   * - call `trySetPluginInstanceStaticConfiguration`.
   *   - the relevant plugin validates the new data.
   * - if it returned `["ok"]`, then `set$hasUnsavedChanges(false)`.
   *   - otherwise, we should display the error message given by the plugin.
   */
  function handleSubmitStaticConfig(newData: any) {
    setPluginInstanceStaticConfiguration(
      $props.pluginId,
      $props.pluginInstanceKey,
      newData,
    );
    set$hasUnsavedChanges(false);
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
      <div class="flex justify-end">
        <button class="btn btn-primary btn-soft" onClick={handleRemove}>
          <VsTrash size={24} />
        </button>
      </div>
      <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
        <div class="card-body">
          <h2 class="card-title">
            Static Configuration
            <Show when={$hasUnsavedChanges()}>
              <span class="italic text-sm">(*unsaved changes)</span>
            </Show>
          </h2>
          <Show
            when={bothNonNull(
              $staticConfigJsonSchema(),
              stringToNull($staticConfigData()),
            )}
            fallback={<LoadingSpan class="mx-auto" size="xl" />}
          >
            {($both) => (
              <Jsfe
                schema={$both()[0]}
                data={$both()[1]}
                dataChangedCallback={handleChangeStaticConfig}
                submitCallback={handleSubmitStaticConfig}
              />
            )}
          </Show>
        </div>
      </div>
    </>
  );
};
