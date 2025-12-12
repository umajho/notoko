import { match, P } from "ts-pattern";

import {
  batch,
  type Component,
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  Show,
  Switch,
} from "solid-js";
import { createAsync, useAction } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { Title } from "@solidjs/meta";

import {
  PluginId,
  PluginInstanceKey,
  type PluginMultiton,
} from "@notoko/definitions";

import { Jsfe } from "~/components/web-components/Jsfe";
import { cls } from "~/utils/cls";
import { makeTitle } from "~/utils/titles";
import { stringToNull } from "~/utils/misc";
import { useRuntimePagePluginsTabParams } from "~/utils/routing";
import { getLiveQueryingClientSingleton } from "~/client/singletons";
import { getPluginInstaceKeyRecommendation } from "~/client/queries";
import { newPluginInstanceAction } from "~/client/actions";
import { urlEncodeToSafePathSegment } from "@notoko/utils/path-segment-url-encoding";

export default (() => {
  const { $selectedPluginId } = useRuntimePagePluginsTabParams();

  return (
    <>
      <Title>{makeTitle("New Plugin Instance for …")}</Title>

      <main class="prose container mx-auto">
        <MainContent pluginId={$selectedPluginId()!} />
      </main>
    </>
  );
}) satisfies Component<{}>;

const MainContent: Component<{
  pluginId: PluginId;
}> = ($props) => {
  const lqClient = getLiveQueryingClientSingleton();
  const $info = createMemo(() => lqClient.queryPluginInfo($props.pluginId)());

  return (
    <Switch>
      <Match when={$info() === "loading"}>TODO: LOADING</Match>
      <Match when={$info() === "not_found"}>TODO: NOT FOUND</Match>
      <Match when={stringToNull($info())}>
        {($info) =>
          match($info())
            .with(
              { type: "plugin:multiton" },
              (info) => (
                <MainContentReady pluginId={$props.pluginId} info={info} />
              ),
            )
            .otherwise(() => <>TODO: NOT A MULTITON</>)}
      </Match>
    </Switch>
  );
};

const MainContentReady: Component<{
  pluginId: PluginId;
  info: PluginMultiton["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

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
  const [$staticConfigData, set$staticConfigData] = createSignal<object>({});

  const [$state, set$state] = createSignal<
    "untouched" | "touched" | "submitting"
  >("untouched");

  // TODO: don't rerun if it is known that the plugin cannot recommend the
  // instance key.
  const $recommendedInstanceKey = createAsync(async () =>
    getPluginInstaceKeyRecommendation($props.pluginId, $staticConfigData())
  );

  // XXX: if I use `$canPluginRecommandInstanceKey = () => match …` or
  // `createMemo(() => match …)`, the whole page apart from the outmost layout
  // (the navbar) will be redrawn every time `$recommendedInstanceKey` changes.
  // This seems to be a bug on the Solid side.
  const $canPluginRecommandInstanceKey = (() => {
    const [$canPluginRecommandInstanceKey, set$canPluginRecommandInstanceKey] = //
      createSignal(false);
    createEffect(() =>
      set$canPluginRecommandInstanceKey(
        match($recommendedInstanceKey())
          .with(["ok", P._], () => true)
          .otherwise(() => false),
      )
    );
    return $canPluginRecommandInstanceKey;
  })();

  const [$instanceKey, set$instanceKey] = createSignal<string>("");
  const [$shouldUseRecommendation, set$shouldUseRecommendation] = //
    createSignal<boolean>(true);
  createEffect(on($canPluginRecommandInstanceKey, (v) => {
    if (typeof v === "boolean") {
      set$shouldUseRecommendation(v);
    }
  }));

  const $isInstanceKeyValid = createMemo(
    () => PluginInstanceKey.safeParse($instanceKey()).success,
  );
  createEffect(() => {
    if ($shouldUseRecommendation()) {
      const k = match($recommendedInstanceKey())
        .with(["ok", P.select()], (k) => k)
        .otherwise(() => NaN);
      if (typeof k !== "number") {
        set$instanceKey(k ?? "");
      }
    }
  });

  function handleChangeStaticConfig(newData: any) {
    batch(() => {
      set$state("touched");
      set$staticConfigData(newData);
    });
  }

  const newPluginInstance = useAction(newPluginInstanceAction);

  /**
   * TODO: The actual flow should be:
   * - call `tryNewPluginInstance`.
   *   - the relevant plugin validates the new data.
   * - if it returned `["ok"]`, then `set$hasUnsavedChanges(false)`.
   *   - otherwise, we should display the error message given by the plugin.
   */
  async function handleSubmitStaticConfig(newData: any) {
    if ($state() === "submitting") return;

    set$state("submitting");
    const instanceKey = PluginInstanceKey.parse($instanceKey());
    await newPluginInstance($props.pluginId, instanceKey, newData);

    const keyEncoded = urlEncodeToSafePathSegment(instanceKey);
    window.location.href =
      `/runtime/plugins/${$props.pluginId}/instances/${keyEncoded}`;
  }

  return (
    <>
      <Title>
        {makeTitle(`New Plugin Instance for ${$props.info.shownName}`)}
      </Title>
      <div class="flex flex-col gap-4">
        <h1>{$props.info.shownName}</h1>
        <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
          <div class="card-body">
            <h2 class="card-title">
              Instance Name{" "}
              <span class="text-sm">(cannot be changed later)</span>
              <Show when={!$isInstanceKeyValid()}>
                <span class="text-error text-xs italic">(*invalid)</span>
              </Show>
            </h2>
            <label class="floating-label w-full">
              <span>Instance Key</span>
              <input
                type="text"
                placeholder="Instance Key"
                class="input input-md w-full"
                value={$instanceKey()}
                onInput={(ev) => set$instanceKey(ev.target.value)}
                disabled={$shouldUseRecommendation()}
              />
            </label>
            <Show when={$canPluginRecommandInstanceKey()}>
              <label class="label">
                <input
                  type="checkbox"
                  checked={$shouldUseRecommendation()}
                  onChange={(ev) =>
                    set$shouldUseRecommendation(ev.target.checked)}
                  class="checkbox"
                />
                Use recommendation.
              </label>
            </Show>
          </div>
        </div>
        <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
          <div class="card-body">
            <h2 class="card-title">
              Static Configuration
              <Show when={$state()}>
                <span class="italic text-sm">(*unsaved changes)</span>
              </Show>
            </h2>
            <Jsfe
              schema={$staticConfigJsonSchema()}
              data={$staticConfigData()}
              dataChangedCallback={handleChangeStaticConfig}
              submitCallback={handleSubmitStaticConfig}
              submitButton={$state() !== "submitting"}
            />
            <Show when={$state() === "submitting"}>
              TODO: SUBMITTING
            </Show>
          </div>
        </div>
      </div>
    </>
  );
};
