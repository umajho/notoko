import { type Component, createSignal, Show } from "solid-js";

import type {
  FunctionalityMethodDemonstratorContext,
  FunctionalityMethodInvocationExResult,
  Language,
  PhonemeLexicon,
} from "@notoko/definitions";

import type {
  DurationPredictorPredictDurationInput,
  DurationPredictorPredictDurationOutput,
  DurationPredictorPredictDurationSpecifier,
  DurationPredictorSpecification,
} from "../definitions";

import {
  JsonTextarea,
  LanguageAndPhonemeLexiconSelector,
  NumberInputThatCanBeFallbackToTextInput,
} from "./shared/components-utils";

const DemonstratorDurationPredictorPredictDuration: Component<{
  specification: DurationPredictorSpecification;
  invoke: (
    specifier: DurationPredictorPredictDurationSpecifier,
    input: DurationPredictorPredictDurationInput,
  ) => Promise<
    FunctionalityMethodInvocationExResult<
      DurationPredictorPredictDurationOutput
    >
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

  const [$speed, set$speed] = createSignal(1);
  const $isSpeedValid = () => $speed() > 0;

  const $areInputsValid = () => !!$validSegsData() && $isSpeedValid();

  const [$result, set$result] = createSignal<
    | FunctionalityMethodInvocationExResult<
      DurationPredictorPredictDurationOutput
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
        { phonemeSegments: $validSegsData()!, speed: $speed() },
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

export default DemonstratorDurationPredictorPredictDuration;
