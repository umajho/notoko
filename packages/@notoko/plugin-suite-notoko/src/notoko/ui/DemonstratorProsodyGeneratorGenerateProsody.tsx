import { match } from "ts-pattern";

import {
  type Component,
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
} from "solid-js";

import type {
  FunctionalityMethodDemonstratorContext,
  FunctionalityMethodInvocationExResult,
  Language,
  PhonemeLexicon,
} from "@notoko/definitions";

import type {
  ProsodyGeneratorGenerateProsodyInput,
  ProsodyGeneratorGenerateProsodyInputDuration,
  ProsodyGeneratorGenerateProsodyOutput,
  ProsodyGeneratorGenerateProsodySpecifier,
  ProsodyGeneratorSpecification,
} from "../definitions";

import {
  JsonTextarea,
  LanguageAndPhonemeLexiconSelector,
  NumberInputThatCanBeFallbackToTextInput,
} from "./shared/components-utils";
import {
  type ButtonTabEntry,
  ButtonTabs,
} from "./shared/components-rudimentary";

const DemonstratorProsodyGeneratorGenerateProsody: Component<{
  specification: ProsodyGeneratorSpecification;
  invoke: (
    specifier: ProsodyGeneratorGenerateProsodySpecifier,
    input: ProsodyGeneratorGenerateProsodyInput,
  ) => Promise<
    FunctionalityMethodInvocationExResult<ProsodyGeneratorGenerateProsodyOutput>
  >;
  context: FunctionalityMethodDemonstratorContext;
}> = ($props) => {
  const [$selectedLanguage, set$selectedLanguage] = //
    createSignal<Language | null>(
      $props.specification
        .supportedLanguageAndPhonemeLexiconCombinations[0]?.language ?? null,
    );
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(null);

  const [$validSegsData, set$validSegsData] = createSignal(null);

  const [$durationMode, set$durationMode] = createSignal<"simple" | "custom">(
    $props.specification.durationInputSupport === "forbidden"
      ? "simple"
      : "custom",
  );
  const $durationModeTabEntries = createMemo<ButtonTabEntry[]>(() => [
    {
      name: "Custom",
      isActive: $durationMode() === "custom",
      isDisabled: $props.specification.durationInputSupport === "forbidden",
      onClick: () => set$durationMode("custom"),
    },
    {
      name: "Simple",
      isActive: $durationMode() === "simple",
      isDisabled: $props.specification.durationInputSupport === "required",
      onClick: () => set$durationMode("simple"),
    },
  ]);

  const [$speed, set$speed] = createSignal(1);
  const $isSpeedValid = () => $speed() > 0;
  const [$validDurationData, set$validDurationData] = createSignal(null);
  const $validDuration = createMemo(() =>
    match($durationMode())
      .returnType<ProsodyGeneratorGenerateProsodyInputDuration | null>()
      .with("simple", () =>
        $isSpeedValid() ? ["simple", { speed: $speed() }] : null)
      .with("custom", () =>
        $validDurationData() ? ["custom", $validDurationData()!] : null)
      .exhaustive()
  );

  const $areInputsValid = () => !!$validSegsData() && !!$validDuration();

  const [$result, set$result] = createSignal<
    | FunctionalityMethodInvocationExResult<
      ProsodyGeneratorGenerateProsodyOutput
    >
    | null
  >(null);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($result() === "processing") return;
    if (!$areInputsValid()) return;
    set$result("processing");

    set$result(
      await $props.invoke(
        {
          language: $selectedLanguage()!,
          phonemeLexicon: $selectedPhonemeLexicon()!,
        },
        { phonemeSegments: $validSegsData()!, duration: $validDuration()! },
      ),
    );
  }

  const InvocationJsonResultDisplayer = $props
    .context.makeInvocationJsonResultDisplayer();

  return (
    <div class="flex flex-col">
      <form onSubmit={handleSubmit}>
        <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
          <legend class="fieldset-legend">Input</legend>
          <div class="flex justify-between items-center">
            <LanguageAndPhonemeLexiconSelector
              selectedLanguage={$selectedLanguage()}
              set$selectedLanguage={set$selectedLanguage}
              supportedLanguageAndPhonemeLexiconCombinations={$props
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
            <JsonTextarea placeholder="[…]" set$validData={set$validSegsData} />
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
      <Show when={$result()}>
        {($result) => (
          <>
            <h3>Result:</h3>
            <InvocationJsonResultDisplayer result={$result()} />
          </>
        )}
      </Show>
    </div>
  );
};

export default DemonstratorProsodyGeneratorGenerateProsody;
