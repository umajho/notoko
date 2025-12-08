import { match, P } from "ts-pattern";
import * as _ from "es-toolkit";

import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onMount,
  type Setter,
  Show,
  Switch,
} from "solid-js";
import { useAction } from "@solidjs/router";
import { usePrefersDark } from "@solid-primitives/media";
import { VsArrowRight, VsError } from "solid-icons/vs";
import { toast } from "solid-sonner";

import {
  type DurationPredictResult,
  type Functionality,
  type FunctionalityDurationPredictor,
  FunctionalityFqn,
  type FunctionalityPhonemizer,
  type FunctionalityProsodyGenerator,
  type IsValidPhonemeResult,
  Language,
  LanguageWithScript,
  makeFunctionalityFqn,
  PhonemeLexicon,
  type PhonemizeResult,
  type PluginId,
  type PluginInstanceFunctionalityKey,
  type PluginInstanceKey,
} from "@notoko/definitions";

import { stringToNull, tryExtract } from "~/utils/misc";
import { cls } from "~/utils/cls";
import { getLiveQueryingClientSingleton } from "~/client/singletons";
import {
  durationPredictorPredictDurationAction,
  type FunctionalityActionResult,
  phonemizerIsValidPhonemeAction,
  phonemizerPhonemizeAction,
  prosodyGeneratorGenerateProsodyAction,
  type ProsodyGeneratorGenerateProsodyActionInputDuration,
} from "~/client/actions";

import {
  type ButtonTabEntry,
  ButtonTabs,
  LoadingSpan,
} from "../ui/rudimentary";
import { JsonViewer } from "../web-components/JsonViewer";
import {
  JsonTextarea,
  NumberInputThatCanBeFallbackToTextInput,
} from "../ui/misc";

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

  const p = "functionality:";
  function tryExtractPhonemizer(
    info: Functionality["info"],
  ): FunctionalityPhonemizer["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}phonemizer`);
  }
  function tryExtractDurationPredictor(
    info: Functionality["info"],
  ): FunctionalityDurationPredictor["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}duration_predictor`);
  }
  function tryExtractProsodyGenerator(
    info: Functionality["info"],
  ): FunctionalityProsodyGenerator["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}prosody_generator`);
  }

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
            <Match when={tryExtractPhonemizer($info())}>
              {($info) => (
                <PhonemizerDemonstrator
                  fqn={$fqn()}
                  info={$info()}
                  set$title={$props.set$title}
                />
              )}
            </Match>
            <Match when={tryExtractDurationPredictor($info())}>
              {($info) => (
                <DurationPredictorDemonstrator
                  fqn={$fqn()}
                  info={$info()}
                  set$title={$props.set$title}
                />
              )}
            </Match>
            <Match when={tryExtractProsodyGenerator($info())}>
              {($info) => (
                <ProsodyGeneratorDemonstrator
                  fqn={$fqn()}
                  info={$info()}
                  set$title={$props.set$title}
                />
              )}
            </Match>
          </Switch>
        )}
      </Match>
    </Switch>
  );
};

const PhonemizerDemonstrator: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
  set$title: Setter<string>;
}> = ($props) => {
  onMount(() => {
    $props.set$title(`Phonemizer: ${$props.info.shownName}`);
  });

  return (
    <>
      <h1>Phonemizer: {$props.info.shownName}</h1>
      <span>
        FQN: <code>{$props.fqn}</code>
      </span>
      <div class="flex flex-col gap-4">
        <PhonemizerDemonstratorPhonemize {...$props} />
        <PhonemizerDemonstratorIsValidPhoneme {...$props} />
      </div>
    </>
  );
};

const PhonemizerDemonstratorPhonemize: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const [$selectedLang, set$selectedLanguage] = createSignal<
    LanguageWithScript | null
  >($props.info.specification.supportedLanguages[0] ?? null);
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(
      $props.info.specification.supportedOutputPhonemeLexica[0] ?? null,
    );
  const [$text, set$text] = createSignal<string>("");

  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<PhonemizeResult> | null | "processing"
  >(null);

  const phonemizerPhonemize = useAction(phonemizerPhonemizeAction);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($actionResult() === "processing") return;
    set$actionResult("processing");
    set$actionResult(
      await phonemizerPhonemize($props.fqn, {
        specificer: {
          language: $selectedLang()!,
          outputPhonemeLexicon: $selectedPhonemeLexicon()!,
        },
        input: { text: $text() },
      }),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>phonemize</code>
        </h2>
        <form onSubmit={handleSubmit}>
          <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
            <legend class="fieldset-legend">Input</legend>
            <div class="flex justify-between">
              <div class="flex gap-4">
                <select
                  class="select select-sm w-fit"
                  onInput={(ev) => set$selectedLanguage(ev.target.value as any)}
                >
                  <option disabled selected={!$selectedLang()}>
                    {"Language-Script (<ISO 639-3>-<ISO 15924>)"}
                  </option>
                  <For each={$props.info.specification.supportedLanguages}>
                    {(lang) => (
                      <option value={lang} selected={$selectedLang() === lang}>
                        {lang}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class="m-auto">
                <VsArrowRight size={24} />
              </div>
              <select
                class="select select-sm w-fit"
                onInput={(ev) =>
                  set$selectedPhonemeLexicon(ev.target.value as any)}
              >
                <option disabled selected={!$selectedPhonemeLexicon()}>
                  Phoneme Lexicon
                </option>
                <For
                  each={$props.info.specification.supportedOutputPhonemeLexica}
                >
                  {(format) => (
                    <option
                      value={format}
                      selected={$selectedPhonemeLexicon() === format}
                    >
                      {format}
                    </option>
                  )}
                </For>
              </select>
            </div>
            <div class="join w-full">
              <label class="floating-label w-full">
                <span>Text</span>
                <input
                  type="text"
                  placeholder="Text"
                  class="join-item input input-md w-full"
                  value={$text()}
                  onInput={(ev) => set$text(ev.target.value)}
                />
              </label>
              <input type="submit" class="join-item btn btn-primary">
                Submit
              </input>
            </div>
          </fieldset>
        </form>
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const PhonemizerDemonstratorIsValidPhoneme: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(
      $props.info.specification.supportedOutputPhonemeLexica[0] ?? null,
    );
  const [$inputPhoneme, set$inputPhoneme] = createSignal<any>("");

  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<IsValidPhonemeResult> | null | "processing"
  >(null);

  const phonmeizerIsValidPhoneme = useAction(phonemizerIsValidPhonemeAction);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($actionResult() === "processing") return;
    set$actionResult("processing");
    set$actionResult(
      await phonmeizerIsValidPhoneme($props.fqn, {
        specifier: { phonemeLexicon: $selectedPhonemeLexicon()! },
        input: { phoneme: $inputPhoneme() },
      }),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>isValidPhoneme</code>
        </h2>
        <form onSubmit={handleSubmit}>
          <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
            <legend class="fieldset-legend">Input</legend>
            <div class="join w-full">
              <select
                class="join-item select w-fit"
                onInput={(ev) =>
                  set$selectedPhonemeLexicon(ev.target.value as any)}
              >
                <option disabled selected={!$selectedPhonemeLexicon()}>
                  Phoneme Lexicon
                </option>
                <For
                  each={$props.info.specification.supportedOutputPhonemeLexica}
                >
                  {(format) => (
                    <option
                      value={format}
                      selected={$selectedPhonemeLexicon() === format}
                    >
                      {format}
                    </option>
                  )}
                </For>
              </select>
              <label class="floating-label w-full">
                <span>Phoneme</span>
                <input
                  type="text"
                  placeholder="Phoneme"
                  class="join-item input input-md w-full"
                  value={$inputPhoneme()}
                  onInput={(ev) => set$inputPhoneme(ev.target.value)}
                />
              </label>
              <input type="submit" class="join-item btn btn-primary">
                Submit
              </input>
            </div>
          </fieldset>
        </form>
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const DurationPredictorDemonstrator: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityDurationPredictor["info"];
  set$title: Setter<string>;
}> = ($props) => {
  onMount(() => {
    $props.set$title(`Duration Predictor: ${$props.info.shownName}`);
  });

  return (
    <>
      <h1>Duration Predictor: {$props.info.shownName}</h1>
      <span>
        FQN: <code>{$props.fqn}</code>
      </span>
      <div class="flex flex-col gap-4">
        <DurationPredictorDemonstratorPredictDuration {...$props} />
      </div>
    </>
  );
};

const DurationPredictorDemonstratorPredictDuration: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityDurationPredictor["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const [$selectedLanguage, set$selectedLanguage] = //
    createSignal<Language | null>(
      $props.info.specification
        .supportedLanguageAndPhonemeLexiconCombinations[0]?.language ?? null,
    );
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(null);

  const [$validSegsData, set$validSegsData] = createSignal(null);

  const [$speed, set$speed] = createSignal(1);
  const $isSpeedValid = () => $speed() > 0;

  const $areInputsValid = () => !!$validSegsData() && $isSpeedValid();

  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<DurationPredictResult> | null | "processing"
  >(null);

  const predictDuration = useAction(durationPredictorPredictDurationAction);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($actionResult() === "processing") return;
    if (!$areInputsValid()) return;
    set$actionResult("processing");

    set$actionResult(
      await predictDuration($props.fqn, {
        specifier: {
          language: $selectedLanguage()!,
          phonemeLexicon: $selectedPhonemeLexicon()!,
        },
        input: { phonemeSegments: $validSegsData()!, speed: $speed() },
      }),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>predictDuration</code>
        </h2>
        <form onSubmit={handleSubmit}>
          <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
            <legend class="fieldset-legend">Input</legend>
            <div class="flex justify-between items-center">
              <LanguageAndPhonemeLexiconSelector
                selectedLanguage={$selectedLanguage()}
                set$selectedLanguage={set$selectedLanguage}
                supportedLanguageAndPhonemeLexiconCombinations={$props.info
                  .specification.supportedLanguageAndPhonemeLexiconCombinations}
                selectedPhonemeLexicon={$selectedPhonemeLexicon()}
                set$selectedPhonemeLexicon={set$selectedPhonemeLexicon}
              />
              <input
                type="submit"
                class="btn btn-primary"
                disabled={!$areInputsValid()}
              >
                Submit
              </input>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">
                Phoneme Segments
                <Show when={!$validSegsData()}>
                  <span class="text-error text-xs italic">
                    (*invalid)
                  </span>
                </Show>
              </legend>
              <JsonTextarea
                placeholder="[…]"
                set$validData={set$validSegsData}
              />
            </fieldset>
            <label class="floating-label">
              <span>
                Speed
                <Show when={!$isSpeedValid()}>
                  <span class="text-error text-xs italic">
                    (*invalid)
                  </span>
                </Show>
              </span>
              <NumberInputThatCanBeFallbackToTextInput
                step={0.05}
                min={0}
                value={$speed()}
                set$value={set$speed}
              />
            </label>
          </fieldset>
        </form>
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const ProsodyGeneratorDemonstrator: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityProsodyGenerator["info"];
  set$title: Setter<string>;
}> = ($props) => {
  onMount(() => {
    $props.set$title(`Prosody Generator: ${$props.info.shownName}`);
  });

  return (
    <>
      <h1>Prosody Generator: {$props.info.shownName}</h1>
      <span>
        FQN: <code>{$props.fqn}</code>
      </span>
      <div class="flex flex-col gap-4">
        <ProsodyGeneratorDemonstratorGenerateProsody {...$props} />
      </div>
    </>
  );
};

const ProsodyGeneratorDemonstratorGenerateProsody: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityProsodyGenerator["info"];
}> = ($props) => {
  const $prefersDark = usePrefersDark();

  const [$selectedLanguage, set$selectedLanguage] = //
    createSignal<Language | null>(
      $props.info.specification
        .supportedLanguageAndPhonemeLexiconCombinations[0]?.language ?? null,
    );
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(null);

  const [$validSegsData, set$validSegsData] = createSignal(null);

  const [$durationMode, set$durationMode] = createSignal<"simple" | "custom">(
    $props.info.specification.durationInput === "forbidden"
      ? "simple"
      : "custom",
  );
  const $durationModeTabEntries = createMemo<ButtonTabEntry[]>(() => [
    {
      name: "Custom",
      isActive: $durationMode() === "custom",
      isDisabled: $props.info.specification.durationInput === "forbidden",
      onClick: () => set$durationMode("custom"),
    },
    {
      name: "Simple",
      isActive: $durationMode() === "simple",
      isDisabled: $props.info.specification.durationInput === "required",
      onClick: () => set$durationMode("simple"),
    },
  ]);

  const [$speed, set$speed] = createSignal(1);
  const $isSpeedValid = () => $speed() > 0;
  const [$validDurationData, set$validDurationData] = createSignal(null);
  const $validDuration = createMemo(() =>
    match($durationMode())
      .returnType<ProsodyGeneratorGenerateProsodyActionInputDuration | null>()
      .with("simple", () =>
        $isSpeedValid() ? ["simple", { speed: $speed() }] : null)
      .with("custom", () =>
        $validDurationData() ? ["custom", $validDurationData()!] : null)
      .exhaustive()
  );

  const $areInputsValid = () => !!$validSegsData() && !!$validDuration();

  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<DurationPredictResult> | null | "processing"
  >(null);

  const generateProsody = useAction(prosodyGeneratorGenerateProsodyAction);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($actionResult() === "processing") return;
    if (!$areInputsValid()) return;
    set$actionResult("processing");

    set$actionResult(
      await generateProsody($props.fqn, {
        specifier: {
          language: $selectedLanguage()!,
          phonemeLexicon: $selectedPhonemeLexicon()!,
        },
        input: {
          phonemeSegments: $validSegsData()!,
          duration: $validDuration()!,
        },
      }),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>generateProsody</code>
        </h2>
        <form onSubmit={handleSubmit}>
          <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
            <legend class="fieldset-legend">Input</legend>
            <div class="flex justify-between items-center">
              <LanguageAndPhonemeLexiconSelector
                selectedLanguage={$selectedLanguage()}
                set$selectedLanguage={set$selectedLanguage}
                supportedLanguageAndPhonemeLexiconCombinations={$props.info
                  .specification.supportedLanguageAndPhonemeLexiconCombinations}
                selectedPhonemeLexicon={$selectedPhonemeLexicon()}
                set$selectedPhonemeLexicon={set$selectedPhonemeLexicon}
              />
              <input
                type="submit"
                class="btn btn-primary"
                disabled={!$areInputsValid()}
              >
                Submit
              </input>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">
                Phoneme Segments
                <Show when={!$validSegsData()}>
                  <span class="text-error text-xs italic">
                    (*invalid)
                  </span>
                </Show>
              </legend>
              <JsonTextarea
                placeholder="[…]"
                set$validData={set$validSegsData}
              />
            </fieldset>
            <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
              <legend class="fieldset-legend">Duration</legend>
              <ButtonTabs tabs={$durationModeTabEntries} />
              <Switch>
                <Match when={$durationMode() === "custom"}>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">
                      Duration Prediction
                      <Show when={!$validDurationData()}>
                        <span class="text-error text-xs italic">
                          (*invalid)
                        </span>
                      </Show>
                    </legend>
                    <JsonTextarea
                      placeholder='{ "durationTicks2d": …, "ticksPerSecond": … }'
                      set$validData={set$validDurationData}
                    />
                  </fieldset>
                </Match>
                <Match when={$durationMode() === "simple"}>
                  <label class="floating-label">
                    <span>
                      Speed
                      <Show when={!$isSpeedValid()}>
                        <span class="text-error text-xs italic">
                          (*invalid)
                        </span>
                      </Show>
                    </span>
                    <NumberInputThatCanBeFallbackToTextInput
                      step={0.05}
                      min={0}
                      value={$speed()}
                      set$value={set$speed}
                    />
                  </label>
                </Match>
              </Switch>
            </fieldset>
          </fieldset>
        </form>
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const LanguageAndPhonemeLexiconSelector: Component<{
  selectedLanguage: Language | null;
  set$selectedLanguage: Setter<Language | null>;
  supportedLanguageAndPhonemeLexiconCombinations: readonly {
    language: Language;
    phonemeLexicon: PhonemeLexicon;
  }[];
  selectedPhonemeLexicon: PhonemeLexicon | null;
  set$selectedPhonemeLexicon: Setter<PhonemeLexicon | null>;
}> = ($props) => {
  const $selectablePhonemeLexica = createMemo(() => {
    const scripts = $props.supportedLanguageAndPhonemeLexiconCombinations
      .filter((c) => c.language === $props.selectedLanguage)
      .map((c) => c.phonemeLexicon);
    return _.uniq(scripts);
  });
  createEffect(() => {
    const first = $selectablePhonemeLexica().at(0);
    $props.set$selectedPhonemeLexicon(first ?? null);
  });

  return (
    <div class="flex gap-4">
      <select
        class="select select-sm w-fit"
        onInput={(ev) => $props.set$selectedLanguage(ev.target.value as any)}
      >
        <option disabled selected={!$props.selectedLanguage}>
          Language (ISO 639-3)
        </option>
        <For each={$props.supportedLanguageAndPhonemeLexiconCombinations}>
          {(c) => (
            <option
              value={c.language}
              selected={$props.selectedLanguage === c.language}
            >
              {c.language}
            </option>
          )}
        </For>
      </select>
      <Show when={$selectablePhonemeLexica().length}>
        <select
          class="select select-sm w-fit"
          onInput={(ev) =>
            $props.set$selectedPhonemeLexicon(ev.target.value as any)}
        >
          <option disabled>Phoneme Lexica</option>
          <For each={$selectablePhonemeLexica()}>
            {(phonemeLexicon) => (
              <option
                value={phonemeLexicon}
                selected={$props.selectedPhonemeLexicon === phonemeLexicon}
              >
                {phonemeLexicon}
              </option>
            )}
          </For>
        </select>
      </Show>
    </div>
  );
};

const ActionJsonResultDisplayer: Component<{
  actionResult:
    | "processing"
    | ["error", "functionality_not_found"]
    | ["error", "functionality_type_mismatch", string]
    | ["error", "exception", { message: string; trace?: string }]
    | ["ok", ["error", ...any] | ["ok", any]];
}> = ($props) => {
  return (
    <>
      {match($props.actionResult)
        .with(
          "processing",
          () => <LoadingSpan class="mx-auto" size="xl" />,
        )
        .with(
          ["error", "functionality_not_found"],
          () => "TODO: FUNCTIONALITY NOT FOUND",
        )
        .with(
          ["error", "functionality_type_mismatch", P.select()],
          (t) => <>TODO: FUNCTIONALITY TYPE MISMATCH: {t}</>,
        )
        .with(
          ["error", "exception", P.select()],
          ({ trace }) => <>TODO: EXCEPTION: {trace}</>,
        )
        .with(
          ["ok", ["error", ...P.array()]],
          ([_1, [_2, ...rest]]) => (
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
          ["ok", ["ok", P.select()]],
          (data) => <JsonDisplayer data={data} />,
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

export function getFunctionalityTypeDisplayName(
  t: Functionality["type"],
): string {
  switch (t) {
    case "functionality:phonemizer":
      return "Phonemizer";
    case "functionality:duration_predictor":
      return "Duration Predictor";
    case "functionality:prosody_generator":
      return "Prosody Generator";
    default:
      t satisfies never;
      throw new Error("unreachable!");
  }
}
