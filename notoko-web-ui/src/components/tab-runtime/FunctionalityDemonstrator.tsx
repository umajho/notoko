import { match, P } from "ts-pattern";
import * as _ from "es-toolkit";

import {
  type Component,
  createMemo,
  createSignal,
  For,
  Match,
  onMount,
  type Setter,
  Show,
  Switch,
} from "solid-js";
import { createAsync, useAction } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { VsError } from "solid-icons/vs";
import { toast } from "solid-sonner";

import {
  extractPartsFromFunctionalityDictionaryEntryFqn,
  type Functionality,
  FunctionalityDictionaryEntry,
  type FunctionalityDictionaryEntryFqnParts,
  FunctionalityFqn,
  FunctionalityMethod,
  type FunctionalityMethodDemonstratorContext,
  type FunctionalityMethodInvocationExResult,
  FunctionalityMethodName,
  makeFunctionalityFqn,
  PluginConfigurationSingleton,
  type PluginId,
  type PluginInstanceFunctionalityKey,
  type PluginInstanceKey,
} from "@notoko/definitions";

import { stringToNull } from "~/utils/misc";
import { cls } from "~/utils/cls";
import { getLiveQueryingClientSingleton } from "~/client/singletons";
import { invokeFunctionalityMethodAction } from "~/client/actions";

import {
  type ButtonTabEntry,
  ButtonTabs,
  LoadingSpan,
} from "../ui/rudimentary";
import { JsonViewer } from "../web-components/JsonViewer";

export const FunctionalityDemonstrator: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
  pluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey;
  // NOTE: using `<Title />` to set title in `*Demonstrator` breaks the app,
  // so pass the title out to let the parent set it instead.
  set$title: Setter<string>;
}> = ($props) => {
  const lqClient = getLiveQueryingClientSingleton();

  const $fqn = () =>
    makeFunctionalityFqn(
      $props.pluginId,
      $props.pluginInstanceKey,
      $props.pluginInstanceFunctionalityKey,
    );

  const $info = createMemo(() => lqClient.queryFunctionalityInfo($fqn())());
  const $dictEntryParts = createMemo(() => {
    const info = $info();
    if (typeof info === "string") return;
    return extractPartsFromFunctionalityDictionaryEntryFqn(
      info.dictionaryEntryFqn,
    );
  });
  const $dictPluginInfo = createMemo(
    ():
      | PluginConfigurationSingleton
      | "not_found"
      | "loading"
      | "not_having_functionality_dictionary" => {
      const dictEntryParts = $dictEntryParts();
      if (!dictEntryParts) return "loading";
      const info = lqClient.queryPluginInfo(dictEntryParts.pluginId)();
      if (typeof info === "string") return info;
      if (info.type !== "plugin:singleton" || !info.functionalityDictionary) {
        return "not_having_functionality_dictionary";
      }
      return info as any;
    },
  );

  return (
    <Switch>
      <Match when={$info() === "loading"}>
        <LoadingSpan size="xl" />
      </Match>
      <Match when={$info() === "not_found"}>
        TODO: NOT FOUND
      </Match>
      <Match when={stringToNull($info())}>
        {($info) => (
          <Switch>
            <Match when={$dictPluginInfo() === "loading"}>
              <LoadingSpan size="xl" />
            </Match>
            <Match when={$dictPluginInfo() === "not_found"}>
              TODO: PLUGIN FOR FUNCTIONALITY DICTIONARY NOT FOUND
            </Match>
            <Match
              when={$dictPluginInfo() === "not_having_functionality_dictionary"}
            >
              TODO: PLUGIN FOR FUNCTIONALITY DICTIONARY NOT HAVING FUNCTIONALITY
              DICTIONARY
            </Match>
            <Match when={stringToNull($dictPluginInfo())}>
              {($dictPluginInfo) => {
                const $fnDictEntry = createMemo(() =>
                  $dictPluginInfo().functionalityDictionary![
                    $dictEntryParts()!.functionalityDictionaryEntryKey
                  ]
                );

                return (
                  <Show
                    when={$fnDictEntry()}
                    fallback={
                      <>TODO: FUNCTIONALITY ENTRY NOT FOUND IN DICTIONARY</>
                    }
                  >
                    {($fnDictEntry) => (
                      <FunctionalityDemonstratorInner
                        fqn={$fqn()}
                        info={$info()}
                        fnDictEntryParts={$dictEntryParts()!}
                        fnDictEntry={$fnDictEntry()}
                        set$title={$props.set$title}
                      />
                    )}
                  </Show>
                );
              }}
            </Match>
          </Switch>
        )}
      </Match>
    </Switch>
  );
};

const FunctionalityDemonstratorInner: Component<{
  fqn: FunctionalityFqn;
  info: Functionality["info"];
  fnDictEntryParts: FunctionalityDictionaryEntryFqnParts;
  fnDictEntry: FunctionalityDictionaryEntry;
  set$title: Setter<string>;
}> = ($props) => {
  onMount(() => {
    $props.set$title(
      `${$props.fnDictEntry.shownName}: ${$props.info.shownName}`,
    );
  });

  return (
    <>
      <h1>${$props.fnDictEntry.shownName}: {$props.info.shownName}</h1>
      <span>
        FQN: <code>{$props.fqn}</code>
      </span>
      <div class="flex flex-col gap-4">
        <For each={Object.keys($props.fnDictEntry.methods)}>
          {(methodName) => (
            <FunctionalityMethodDemonstrator
              fqn={$props.fqn}
              info={$props.info}
              fnDictEntryParts={$props.fnDictEntryParts}
              methodName={FunctionalityMethodName.parse(methodName)}
              method={$props.fnDictEntry.methods[methodName as any]!}
            />
          )}
        </For>
      </div>
    </>
  );
};

const FunctionalityMethodDemonstrator: Component<{
  fqn: FunctionalityFqn;
  info: Functionality["info"];
  fnDictEntryParts: FunctionalityDictionaryEntryFqnParts;
  methodName: FunctionalityMethodName;
  method: FunctionalityMethod;
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const ERROR_TEXT =
    "TODO: EROOR WHILE DYNAMACALLY IMPORTING FUNCTIONALITY METHOD DEMONSTRATOR MODULE";

  const importResult = createAsync(
    async (): Promise<
      | Component<{
        specification: unknown;
        invoke: (specifier: unknown, input: unknown) => Promise<
          FunctionalityMethodInvocationExResult<unknown>
        >;
        context: FunctionalityMethodDemonstratorContext;
      }>
      | "loading"
      | "error"
    > => {
      try {
        return (await import(
          /* @vite-ignore */
          [
            "/api/plugins",
            $props.fnDictEntryParts.pluginId,
            "functionality-dictionary",
            $props.fnDictEntryParts.functionalityDictionaryEntryKey,
            "methods",
            FunctionalityMethodName.parse($props.methodName),
            "demonstrator.js",
          ].join("/")
        )).default;
      } catch (e) {
        console.error(ERROR_TEXT, e);
        return "error";
      }
    },
    { initialValue: "loading" },
  );

  const context: FunctionalityMethodDemonstratorContext = {
    makeInvocationJsonResultDisplayer: () => InvocationJsonResultDisplayer,
  };

  const invokeFunctionalityMethod = useAction(invokeFunctionalityMethodAction);

  async function invoke(specifier: unknown, input: unknown): Promise<
    FunctionalityMethodInvocationExResult<unknown>
  > {
    return await invokeFunctionalityMethod(
      $props.fqn,
      $props.methodName,
      specifier,
      input,
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>{$props.methodName}</code>
        </h2>
        {match(importResult())
          .with("loading", () => <LoadingSpan size="lg" />)
          .with("error", () => <>{ERROR_TEXT}</>)
          .with(P._, (Demonstrator) => (
            <Demonstrator
              specification={$props.info}
              invoke={invoke}
              context={context}
            />
          ))
          .exhaustive()}
      </div>
    </div>
  );
};

const InvocationJsonResultDisplayer: Component<{
  result: FunctionalityMethodInvocationExResult<unknown>;
}> = ($props) => {
  return (
    <>
      {match($props.result)
        .with(
          "processing",
          () => <LoadingSpan class="mx-auto" size="xl" />,
        )
        .with(
          ["ok", P.select()],
          (data) => <JsonDisplayer data={data} />,
        )
        .with(
          ["error", "custom", P._],
          ([_, ...rest]) => (
            <div role="alert" class="alert alert-error">
              <VsError class="text-error-content" size={36} />
              <ul>
                <For each={rest}>
                  {(thing) => (
                    <li>
                      <code>{JSON.stringify(thing)}</code>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          ),
        )
        .with(
          ["ex_error", "exception", P.select()],
          ({ trace }) => <>TODO: EXCEPTION: {trace}</>,
        )
        .with(
          ["ex_error", P._],
          ([_, ...rest]) => <>TODO: EX ERROR: {JSON.stringify(rest)}</>,
        )
        .exhaustive()}
    </>
  );
};

const JsonDisplayer: Component<{ data: any }> = ($props) => {
  const TAB_NAMES = ["Text", "Viewer"] as const;

  const [$selectedTab, set$selectedTab] = //
    createSignal<typeof TAB_NAMES[number]>("Viewer");
  const $tabEntries = createMemo<ButtonTabEntry[]>(() => {
    return TAB_NAMES.map((name) => ({
      name,
      isActive: $selectedTab() === name,
      onClick: () => set$selectedTab(name),
    }));
  });

  const $dataJsonText = createMemo(() => JSON.stringify($props.data));

  async function handleCopy() {
    await navigator.clipboard.writeText($dataJsonText());
    toast.success("Copied to clipboard!");
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex justify-between">
        <button class="btn btn-sm btn-primary btn-ghost" onClick={handleCopy}>
          Copy JSON
        </button>
        <ButtonTabs tabs={$tabEntries} />
      </div>
      <Switch>
        <Match when={$selectedTab() === "Text"}>
          <textarea class="textarea w-full h-48" disabled>
            {$dataJsonText()}
          </textarea>
        </Match>
        <Match when={$selectedTab() === "Viewer"}>
          <JsonViewer data={$props.data} expand={"**"} />
        </Match>
      </Switch>
    </div>
  );
};
