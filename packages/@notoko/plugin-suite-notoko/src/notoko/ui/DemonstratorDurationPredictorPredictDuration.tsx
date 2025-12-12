import { type FunctionComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Signal, useComputed, useSignal } from "@preact/signals";
import register from "preact-custom-element";

import type {
  FunctionalityMethodDemonstratorContextForCustomElementRegisterer,
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

export default function (tagName: string) {
  register(DemonstratorDurationPredictorPredictDuration, tagName, [], {
    shadow: false,
  });
}

const DemonstratorDurationPredictorPredictDuration: FunctionComponent<{}> =
  () => {
    const $outerProps: Signal<
      {
        specification: DurationPredictorSpecification;
        invoke: (
          specifier: DurationPredictorPredictDurationSpecifier,
          input: DurationPredictorPredictDurationInput,
        ) => Promise<
          FunctionalityMethodInvocationExResult<
            DurationPredictorPredictDurationOutput
          >
        >;
        context:
          FunctionalityMethodDemonstratorContextForCustomElementRegisterer;
      } | null
    > = useSignal(null);

    const $selectedLanguage = useSignal<Language | null>(null);
    const $selectedPhonemeLexicon = useSignal<PhonemeLexicon | null>(null);

    const $validSegsData = useSignal(null);

    const $speed = useSignal(1);
    const $isSpeedValid = useComputed(() => $speed.value > 0);

    const $areInputsValid = useComputed(() =>
      !!$validSegsData.value && $isSpeedValid.value
    );

    const $result = useSignal<
      | FunctionalityMethodInvocationExResult<
        DurationPredictorPredictDurationOutput
      >
      | null
    >(null);

    async function handleSubmit(ev: Event) {
      ev.preventDefault();
      if ($result.value === "processing") return;
      if (!$areInputsValid.value) return;
      $result.value = "processing";

      $result.value = await $outerProps.value!.invoke(
        {
          language: $selectedLanguage.value!,
          phonemeLexicon: $selectedPhonemeLexicon.value!,
        },
        { phonemeSegments: $validSegsData.value!, speed: $speed.value },
      );
    }

    const $invocationJsonResultDisplayerTagName = //
      useSignal<string | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const xEl = ref.current!.parentElement;
      $outerProps.value = {
        specification: (xEl as any).specification,
        invoke: (xEl as any).invoke,
        context: (xEl as any).context,
      };
      $selectedLanguage.value = $outerProps.value.specification
        .supportedLanguageAndPhonemeLexiconCombinations[0]?.language ?? null;
      $invocationJsonResultDisplayerTagName.value = $outerProps.value
        .context.getInvocationJsonResultDisplayerTagName();
    }, []);

    return (
      <div ref={ref} class="flex flex-col">
        <form onSubmit={handleSubmit}>
          <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
            <legend class="fieldset-legend">Input</legend>
            <div class="flex justify-between items-center">
              {$outerProps.value
                ? (
                  <LanguageAndPhonemeLexiconSelector
                    $selectedLanguage={$selectedLanguage}
                    supportedLanguageAndPhonemeLexiconCombinations={$outerProps
                      .value
                      .specification
                      .supportedLanguageAndPhonemeLexiconCombinations}
                    $selectedPhonemeLexicon={$selectedPhonemeLexicon}
                  />
                )
                : <>TODO: LOADING</>}
              <input
                type="submit"
                class="btn btn-primary"
                disabled={!$areInputsValid.value}
              >
                Submit
              </input>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">
                Phoneme Segments
                {(!$validSegsData.value) &&
                  (
                    <span class="text-error text-xs italic">
                      (*invalid)
                    </span>
                  )}
              </legend>
              <JsonTextarea placeholder="[…]" $validData={$validSegsData} />
            </fieldset>
            <label class="floating-label">
              <span>
                Speed
                {(!$isSpeedValid.value) &&
                  (
                    <span class="text-error text-xs italic">
                      (*invalid)
                    </span>
                  )}
              </span>
              <NumberInputThatCanBeFallbackToTextInput
                step={0.05}
                min={0}
                $value={$speed}
              />
            </label>
          </fieldset>
        </form>
        {$result.value &&
          (
            <>
              <h3>Result:</h3>
              {$invocationJsonResultDisplayerTagName.value &&
                h($invocationJsonResultDisplayerTagName.value, {
                  result: JSON.stringify($result.value),
                })}
            </>
          )}
      </div>
    );
  };
