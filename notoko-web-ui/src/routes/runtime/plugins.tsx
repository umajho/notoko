import {
  type Component,
  createMemo,
  For,
  type JSX,
  Match,
  Switch,
} from "solid-js";
import {
  A,
  type RouteSectionProps,
  useLocation,
  useParams,
} from "@solidjs/router";
import { VsAdd, VsError, VsLoading, VsUnverified } from "solid-icons/vs";

import {
  extractPluginInstanceFunctionalityKeyFromFqn,
  type Functionality,
  FunctionalityFqn,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
  SINGLETON_PLUGIN_INSTANCE_KEY,
} from "@notoko/definitions";
import {
  urlDecodeFromSafePathSegment,
  UrlEncodedSafePathSegment,
  urlEncodeToSafePathSegment,
} from "@notoko/utils/path-segment-url-encoding";

import { cls } from "~/utils/cls";
import { stringToNull } from "~/utils/misc";
import { LoadingSpan } from "~/components/ui/rudimentary";
import { getFunctionalityTypeDisplayName } from "~/components/tab-runtime/FunctionalityDemonstrator";
import { getLiveQueryingClientSingleton } from "~/client/singletons";

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
  const $selectedPluginInstanceFunctionalityKey = () =>
    params.pluginInstanceFunctionalityKeyEncoded
      ? PluginInstanceFunctionalityKey.parse(
        urlDecodeFromSafePathSegment(
          UrlEncodedSafePathSegment.parse(
            params.pluginInstanceFunctionalityKeyEncoded,
          ),
        ),
      )
      : null;

  return {
    $selectedPluginId,
    $selectedPluginInstanceKey,
    $selectedPluginInstanceFunctionalityKey,
  };
}

export default function Layout($props: RouteSectionProps) {
  return (
    <>
      <div class="flex overflow-y-auto">
        <nav class="w-76">
          <Sidebar />
        </nav>
        {$props.children}
      </div>
    </>
  );
}

const Sidebar: Component<{}> = () => {
  const lqClient = getLiveQueryingClientSingleton();

  const {
    $selectedPluginId,
    $selectedPluginInstanceKey,
    $selectedPluginInstanceFunctionalityKey,
  } = useRuntimePagePluginsTabParams();

  const $pluginIds = lqClient.queryPluginIds();

  return (
    <div class="mx-2 overflow-y-scroll bg-base-100 rounded-box">
      <Switch>
        <Match when={$pluginIds() === "loading"}>
          TODO: LOADING
        </Match>
        <Match when={stringToNull($pluginIds())}>
          {($pluginIds) => (
            <ul class="menu w-full">
              <For each={$pluginIds()}>
                {(pluginId) => (
                  <PluginItem
                    pluginId={pluginId}
                    selectedPluginId={$selectedPluginId()}
                    selectedPluginInstanceKey={$selectedPluginInstanceKey()}
                    selectedPluginInstanceFunctionalityKey={$selectedPluginInstanceFunctionalityKey()}
                  />
                )}
              </For>
            </ul>
          )}
        </Match>
      </Switch>
    </div>
  );
};

const PluginItem: Component<{
  pluginId: PluginId;
  selectedPluginId: PluginId | null;
  selectedPluginInstanceKey: null | PluginInstanceKey;
  selectedPluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey | null;
}> = ($props) => {
  const lqClient = getLiveQueryingClientSingleton();

  const $info = createMemo(() => lqClient.queryPluginInfo($props.pluginId)());
  const $instanceKeys = createMemo(() =>
    lqClient.queryPluginInstanceKeys($props.pluginId)()
  );

  const $isActive = () => $props.selectedPluginId === $props.pluginId;

  return (
    <Switch>
      <Match when={$instanceKeys() === "loading"}>
        <LoadingSpan class="mx-auto" flavor="dots" />
      </Match>
      <Match when={stringToNull($instanceKeys())}>
        {($instanceKeys) => (
          <li>
            <button class={cls($isActive() && "menu-active")}>
              {stringToNull($info())?.shownName ?? $props.pluginId}
            </button>
            <InstanceItems
              pluginId={$props.pluginId}
              isPluginActive={$isActive()}
              selectedPluginInstanceKey={$props.selectedPluginInstanceKey}
              selectedPluginInstanceFunctionalityKey={$props
                .selectedPluginInstanceFunctionalityKey}
              instanceKeys={$instanceKeys()}
            />
          </li>
        )}
      </Match>
      <Match when={true}>
        <InstanceItem
          pluginId={$props.pluginId}
          isPluginActive={$isActive()}
          pluginInstanceKey={SINGLETON_PLUGIN_INSTANCE_KEY}
          selectedPluginInstanceKey={$props.selectedPluginInstanceKey}
          selectedPluginInstanceFunctionalityKey={$props
            .selectedPluginInstanceFunctionalityKey}
        >
          <InstanceItemContent
            pluginId={$props.pluginId}
            shownName={stringToNull($info())?.shownName ?? $props.pluginId}
            instanceKey={SINGLETON_PLUGIN_INSTANCE_KEY}
          />
        </InstanceItem>
      </Match>
    </Switch>
  );
};

const InstanceItems: Component<{
  pluginId: PluginId;
  isPluginActive: boolean;
  selectedPluginInstanceKey: PluginInstanceKey | null;
  selectedPluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey | null;
  instanceKeys: PluginInstanceKey[];
}> = ($props) => {
  return (
    <>
      {/* <div class="menu-title">Instances</div> */}
      <ul>
        <For each={$props.instanceKeys}>
          {(instanceKey) => (
            <InstanceItem
              pluginId={$props.pluginId}
              isPluginActive={$props.isPluginActive}
              pluginInstanceKey={instanceKey}
              selectedPluginInstanceKey={$props.selectedPluginInstanceKey}
              selectedPluginInstanceFunctionalityKey={$props
                .selectedPluginInstanceFunctionalityKey}
            >
              <InstanceItemContent
                pluginId={$props.pluginId}
                shownName={instanceKey}
                instanceKey={instanceKey}
              />
            </InstanceItem>
          )}
        </For>
        <NewInstanceItem pluginId={$props.pluginId} />
      </ul>
    </>
  );
};

const InstanceItemContent: Component<{
  pluginId: PluginId;
  shownName: string;
  instanceKey: PluginInstanceKey;
}> = ($props) => {
  const lqClient = getLiveQueryingClientSingleton();
  const $status = createMemo(() =>
    lqClient.queryPluginInstanceStatus($props.pluginId, $props.instanceKey)()
  );

  return (
    <>
      <Switch>
        <Match when={$status() === "unknown"}>
          <VsUnverified />
        </Match>
        <Match when={$status() === "loading"}>
          <VsLoading class="animate-spin" />
        </Match>
        <Match when={$status() === "error"}>
          <VsError class="text-error" />
        </Match>
      </Switch>
      {$props.shownName}
    </>
  );
};

const InstanceItem: Component<{
  children: JSX.Element;
  pluginId: PluginId;
  isPluginActive: boolean;
  pluginInstanceKey: PluginInstanceKey;
  selectedPluginInstanceKey: PluginInstanceKey | null;
  selectedPluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey | null;
}> = ($props) => {
  const $isActive = () =>
    $props.isPluginActive &&
    $props.selectedPluginInstanceKey === $props.pluginInstanceKey;
  const $encodedInstanceKey = () =>
    urlEncodeToSafePathSegment($props.pluginInstanceKey);

  return (
    <li>
      <A
        class={cls($isActive() && "menu-active")}
        href={`/runtime/plugins/${$props.pluginId}/instances/${$encodedInstanceKey()}`}
      >
        {$props.children}
      </A>
      {/* <div class="menu-title">Functionalities</div> */}
      <FunctionalityItems
        pluginId={$props.pluginId}
        pluginInstanceKey={$props.pluginInstanceKey}
        isPluginInstanceActive={$isActive()}
        selectedPluginInstanceFunctionalityKey={$props
          .selectedPluginInstanceFunctionalityKey}
      />
    </li>
  );
};

const NewInstanceItem: Component<{
  pluginId: PluginId;
}> = ($props) => {
  const location = useLocation();

  const href = () => `/runtime/plugins/${$props.pluginId}/~new-instance`;

  return (
    <li>
      <A
        class={cls(
          "flex btn btn-sm btn-dash",
          [location.pathname, location.pathname + "/"].includes(href()) &&
            "menu-active",
        )}
        href={href()}
      >
        <div class="mx-auto">
          <VsAdd />
        </div>
      </A>
    </li>
  );
};

const FunctionalityItems: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
  isPluginInstanceActive: boolean;
  selectedPluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey | null;
}> = ($props) => {
  const lqClient = getLiveQueryingClientSingleton();

  const $fs = createMemo(() =>
    lqClient.queryPluginInstanceFunctionalityInfos(
      $props.pluginId,
      $props.pluginInstanceKey,
    )()
  );

  return (
    <Switch>
      <Match when={$fs() === "loading"}>
        <LoadingSpan class="mx-auto" flavor="dots" />
      </Match>
      <Match when={stringToNull($fs())}>
        {($fs) => (
          <ul>
            <For each={$fs()}>
              {([Fqn, f]) => (
                <FunctionalityItem
                  pluginId={$props.pluginId}
                  pluginInstanceKey={$props.pluginInstanceKey}
                  isPluginInstanceActive={$props.isPluginInstanceActive}
                  selectedPluginInstanceFunctionalityKey={$props
                    .selectedPluginInstanceFunctionalityKey}
                  functionalityFqn={Fqn}
                  functionalityInfo={f}
                />
              )}
            </For>
          </ul>
        )}
      </Match>
    </Switch>
  );
};

const FunctionalityItem: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
  isPluginInstanceActive: boolean;
  selectedPluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey | null;
  functionalityFqn: FunctionalityFqn;
  functionalityInfo: Functionality["info"];
}> = ($props) => {
  const functionalityKey = createMemo(() =>
    extractPluginInstanceFunctionalityKeyFromFqn($props.functionalityFqn)
  );
  const $encodedInstanceKey = () =>
    urlEncodeToSafePathSegment($props.pluginInstanceKey);
  const $encodedFunctionalityKey = () =>
    urlEncodeToSafePathSegment(functionalityKey());

  const $isActive = () =>
    $props.isPluginInstanceActive &&
    functionalityKey() ===
      $props.selectedPluginInstanceFunctionalityKey;

  const typeName = () =>
    getFunctionalityTypeDisplayName($props.functionalityInfo.associatedType);

  return (
    <li>
      <A
        class={cls($isActive() && "menu-active")}
        href={`/runtime/plugins/${$props.pluginId}/instances/${$encodedInstanceKey()}/functionalities/${$encodedFunctionalityKey()}`}
      >
        {typeName()}: {$props.functionalityInfo.shownName}
      </A>
    </li>
  );
};
