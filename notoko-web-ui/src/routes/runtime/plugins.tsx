import { type Component, For, Match, Show, Switch } from "solid-js";
import {
  A,
  createAsync,
  type RouteSectionProps,
  useParams,
} from "@solidjs/router";
import { VsError, VsLoading, VsUnverified } from "solid-icons/vs";

import { cls } from "~/utils/cls";
import {
  type Functionality,
  FunctionalityFQN,
  PluginId,
  PluginInstanceKey,
  type PluginStatus,
  SINGLETON_PLUGIN_INSTANCE_KEY,
} from "~/definitions.mod";
import { stringToNull } from "~/utils/misc";
import {
  gePluginIds,
  getPluginInfo,
  getPluginInstanceFunctionalityInfos,
  getPluginInstanceKeys,
  getPluginInstanceStatus,
} from "~/client-server-bridge/plugin-manager";
import {
  urlDecodeFromSafePathSegment,
  UrlEncodedSafePathSegment,
} from "~/utils/path-segment-url-encoding";
import { LoadingSpan } from "~/components/ui/rudimentary";

export function useRuntimePagePluginsTabParams() {
  const params = useParams();
  const $selectedPluginId = () =>
    params.pluginId ? PluginId.parse(params.pluginId) : null;
  const $selectedPluginInstanceKey = () =>
    params.pluginInstanceKeyEncoded
      ? PluginInstanceKey.parse(
        urlDecodeFromSafePathSegment(
          UrlEncodedSafePathSegment.parse(params.pluginInstanceKeyEncoded),
        ),
      )
      : null;

  return { $selectedPluginId, $selectedPluginInstanceKey };
}

export default function Layout(p$rops: RouteSectionProps) {
  return (
    <>
      <div class="flex">
        <nav class="w-76">
          <Sidebar />
        </nav>
        {p$rops.children}
      </div>
    </>
  );
}

const Sidebar: Component<{}> = () => {
  const {
    $selectedPluginId,
    $selectedPluginInstanceKey,
  } = useRuntimePagePluginsTabParams();

  const $PluginIds = createAsync(() => gePluginIds());

  return (
    <div class="mx-2 overflow-y-scroll bg-base-100 rounded-box">
      <ul class="menu w-full">
        <For each={$PluginIds()}>
          {(pluginId) => (
            <Item
              pluginId={pluginId}
              selectedPluginId={$selectedPluginId()}
              selectedPluginInstanceKey={$selectedPluginInstanceKey()}
            />
          )}
        </For>
      </ul>
    </div>
  );
};

const Item: Component<{
  pluginId: PluginId;
  selectedPluginId: PluginId | null;
  selectedPluginInstanceKey: null | PluginInstanceKey;
}> = ($props) => {
  const $info = createAsync(() => getPluginInfo($props.pluginId));
  const $instanceKeys = createAsync<null | PluginInstanceKey[] | "loading">(
    () => getPluginInstanceKeys($props.pluginId),
    { initialValue: "loading" },
  );

  const $isActive = () => $props.selectedPluginId === $props.pluginId;
  const $isSingleton = () => $instanceKeys() === null;

  const ItemContent: Component<{
    instanceKey: PluginInstanceKey;
  }> = ($props2) => {
    const status = createAsync<PluginStatus | "unknown">(
      () => getPluginInstanceStatus($props.pluginId, $props2.instanceKey),
      { initialValue: "unknown" },
    );

    return (
      <Show
        when={stringToNull($info())}
        fallback={<code>{$props.pluginId}</code>}
      >
        {($info) => (
          <>
            <Switch>
              <Match when={status() === "unknown"}>
                <VsUnverified />
              </Match>
              <Match when={status() === "loading"}>
                <VsLoading class="animate-spin" />
              </Match>
              <Match when={status() === "error"}>
                <VsError class="text-error" />
              </Match>
            </Switch>
            {$info().shownName}
          </>
        )}
      </Show>
    );
  };

  return (
    <li>
      <Show
        when={$isSingleton()}
        fallback={
          <button class={cls("menu-disabled", $isActive() && "menu-active")}>
            <ItemContent instanceKey={SINGLETON_PLUGIN_INSTANCE_KEY} />
          </button>
        }
      >
        <A
          class={cls($isActive() && "menu-active")}
          href={`/runtime/plugins/${$props.pluginId}/instances/${SINGLETON_PLUGIN_INSTANCE_KEY}`}
        >
          <ItemContent instanceKey={SINGLETON_PLUGIN_INSTANCE_KEY} />
        </A>
      </Show>

      <Switch>
        <Match when={$instanceKeys() === "loading"}>
          <LoadingSpan class="mx-auto" flavor="dots" />
        </Match>
        <Match when={stringToNull($instanceKeys())}>
          {($instanceKeys) => (
            <>
              {/* <div class="menu-title">Instances</div> */}
              <ul>
                <For each={$instanceKeys()}>
                  {(instanceKey) => (
                    <li>
                      <button>TODO</button>
                    </li>
                  )}
                </For>
                <li>
                  <button>TODO: +</button>
                </li>
              </ul>
            </>
          )}
        </Match>
        <Match when={true}>
          {/* <div class="menu-title">Functionalities</div> */}
          <Functionalities
            pluginId={$props.pluginId}
            pluginInstanceKey={null}
          />
        </Match>
      </Switch>
    </li>
  );
};

const Functionalities: Component<
  {
    pluginId: PluginId;
    pluginInstanceKey: null | PluginInstanceKey;
  }
> = ($props) => {
  const $fs = createAsync<
    | [FunctionalityFQN, Functionality["info"]][]
    | "loading"
  >(() =>
    getPluginInstanceFunctionalityInfos(
      $props.pluginId,
      $props.pluginInstanceKey ?? SINGLETON_PLUGIN_INSTANCE_KEY,
    ), { initialValue: "loading" });

  return (
    <Switch>
      <Match when={$fs() === "loading"}>
        <LoadingSpan class="mx-auto" flavor="dots" />
      </Match>
      <Match when={stringToNull($fs())}>
        {($fs) => (
          <ul>
            <For each={$fs()}>
              {([absPath, f]) => {
                const typeName = (() => {
                  switch (f.associatedType) {
                    case "functionality:phonemizer":
                      return "Phonemizer";
                    case "functionality:duration_predictor":
                      return "Duration Predictor";
                    case "functionality:prosody_generator":
                      return "Prosody Generator";
                    default:
                      f satisfies never;
                      throw new Error("unreachable!");
                  }
                })();

                return (
                  <li class="menu-disabled">
                    {typeName}: {f.shownName}
                  </li>
                );
              }}
            </For>
          </ul>
        )}
      </Match>
    </Switch>
  );
};
