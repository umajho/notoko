import {
  type Accessor,
  type Component,
  createMemo,
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { Title } from "@solidjs/meta";

import { type TabEntry, Tabs } from "~/components/ui/rudimentary";
import { Jsfe } from "~/components/Jsfe";
import { cls } from "~/utils/cls";
import { makeTitle } from "~/utils/titles";
import type { Plugin, PluginId } from "~/definitions";

export default (() => {
  const TAB_NAMES = [
    "Plugins",
    "Phonemizers",
    "Duration-Predictors",
    "Prosody-Generators",
  ];
  const [$activeTab, set$activeTab] = //
    createSignal<typeof TAB_NAMES[number]>("Plugins");
  const $tabEntries = createMemo<TabEntry[]>(() =>
    TAB_NAMES.map((name) => ({
      name,
      isActive: $activeTab() === name,
      onClick: (ev) => {
        ev.preventDefault();
        set$activeTab(name);
      },
    }))
  );

  return (
    <>
      <nav>
        <Tabs tabs={$tabEntries} />
      </nav>
      <Switch>
        <Match when={$activeTab() === "Plugins"}>
          <PluginTabContent />
        </Match>
        <Match when={true}>
          TODO
        </Match>
      </Switch>
    </>
  );
}) satisfies Component<{}>;

const gePluginIds = query(async () => {
  "use server";

  const { getPluginManagerSingleton } = await import("~/server/plugin-manager");
  const pluginManagerSingleton = getPluginManagerSingleton();

  return pluginManagerSingleton.$pluginIds();
}, "gePluginIds");
const getPluginInfo = query(
  async (
    pluginId: string,
  ): Promise<Plugin["info"] | "not_found"> => {
    "use server";

    const { getPluginManagerSingleton } = await import(
      "~/server/plugin-manager"
    );
    const pluginManagerSingleton = getPluginManagerSingleton();

    const accessor = pluginManagerSingleton.getInfoAccessor(pluginId as any);

    return accessor() ?? "not_found";
  },
  "getPluginInfo",
);

const PluginTabContent: Component = (props) => {
  const $PluginIds = createAsync(() => gePluginIds());

  const [selectedPluginId, setSelectedPluginId] = //
    createSignal<PluginId | null>(null);

  return (
    <>
      <Title>{makeTitle("Plugins")}</Title>
      <div class="flex">
        <nav class="w-76">
          <div class="mx-2 overflow-y-scroll bg-base-100 rounded-box">
            <ul class="menu w-full">
              <For each={$PluginIds()}>
                {(pluginId) => {
                  const $info = createAsync(() => getPluginInfo(pluginId));

                  return (
                    <li
                      class={cls(
                        selectedPluginId() === pluginId && "menu-active",
                      )}
                    >
                      <button onClick={() => setSelectedPluginId(pluginId)}>
                        <Show
                          when={(() => {
                            const info = $info();
                            if (typeof info === "string") return null;
                            return info;
                          })()}
                          fallback={<code>{pluginId}</code>}
                        >
                          {($info) => $info().shownName}
                        </Show>
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </nav>
        <main class="prose container mx-auto">
          <Show when={selectedPluginId()}>
            {(pluginId) => (
              <PluginTabContentMainContent
                pluginId={pluginId()}
              />
            )}
          </Show>
        </main>
      </div>
    </>
  );
};

const PluginTabContentMainContent: Component<{
  pluginId: PluginId;
}> = (props) => {
  const $prefersDark = usePrefersDark();

  const $info = createAsync<Plugin["info"] | "not_found" | "loading">(
    () => getPluginInfo(props.pluginId),
    { initialValue: "loading" },
  );
  const $jsonSchema = createMemo(() => {
    const info = $info();
    if (info === "not_found" || info === "loading") {
      return undefined;
    }
    const tuple = info.staticConfigurationSchema;
    if (!tuple) return {};
    switch (tuple[0]) {
      case "json_schema":
        return tuple[1];
      default:
        tuple[0] satisfies never;
        throw new Error("unreachable!");
    }
  });

  return (
    <Switch>
      <Match when={$info() === "loading"}>
        LOADING
      </Match>
      <Match when={$info() === "not_found"}>
        NOT FOUND
      </Match>
      <Match
        when={(() => {
          const info = $info();
          if (typeof info === "string") return null;
          return info;
        })()}
      >
        {($info) => (
          <>
            <h1>{$info().shownName}</h1>
            <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
              <div class="card-body">
                <h2 class="card-title">Static Configuration</h2>
                <Show when={$jsonSchema()}>
                  {($jsonSchema) => (
                    <Jsfe
                      schema={$jsonSchema()}
                      data={{}}
                      dataChangedCallback={() => {}}
                    />
                  )}
                </Show>
              </div>
            </div>
          </>
        )}
      </Match>
    </Switch>
  );
};
