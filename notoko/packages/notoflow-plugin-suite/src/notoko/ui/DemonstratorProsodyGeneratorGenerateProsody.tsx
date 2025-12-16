import { match } from "ts-pattern";
import * as z from "zod/v4";

import { type FunctionComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Signal, useComputed, useSignal } from "@preact/signals";
import register from "preact-custom-element";

import type {
  FunctionalityMethodDemonstratorContextForCustomElementRegisterer,
  FunctionalityMethodInvocationExResult,
} from "@notoflow/definitions";

import {
  type DurationPrediction,
  type EnergyPrediction,
  type Language,
  type PhonemeLexicon,
  PhonemeSegment,
  type PitchPrediction,
  type ProsodyGeneratorGenerateProsodyInput,
  type ProsodyGeneratorGenerateProsodyOutput,
  type ProsodyGeneratorGenerateProsodySpecifier,
  type ProsodyGeneratorSpecification,
} from "../definitions";

import {
  JsonTextarea,
  LanguageAndPhonemeLexiconSelector,
} from "./shared/components-utils";
import {
  FieldsetFeaturePredictionDuration,
  FieldsetFeaturePredictionEnergy,
  FieldsetFeaturePredictionPitch,
} from "./shared/components-fieldsets";

export default function (tagName: string) {
  register(DemonstratorProsodyGeneratorGenerateProsody, tagName, [], {
    shadow: false,
  });
}

const DemonstratorProsodyGeneratorGenerateProsody: FunctionComponent<{}> =
  () => {
    const $outerProps: Signal<
      {
        specification: ProsodyGeneratorSpecification;
        invoke: (
          specifier: ProsodyGeneratorGenerateProsodySpecifier,
          input: ProsodyGeneratorGenerateProsodyInput,
        ) => Promise<
          FunctionalityMethodInvocationExResult<
            ProsodyGeneratorGenerateProsodyOutput
          >
        >;
        context:
          FunctionalityMethodDemonstratorContextForCustomElementRegisterer;
      } | null
    > = useSignal(null);

    const $selectedLanguage = useSignal<Language | null>(null);
    const $selectedPhonemeLexicon = useSignal<PhonemeLexicon | null>(null);

    const $validSegsData = useSignal<PhonemeSegment[] | null>(null);

    const $durationPredictionData = useSignal<DurationPrediction | null>(null);
    const $pitchPredictionData = useSignal<PitchPrediction | null>(null);
    const $energyPredictionData = useSignal<EnergyPrediction | null>(null);

    const $areInputsValid = useComputed(() =>
      !!$validSegsData.value && !!$durationPredictionData.value &&
      !!$pitchPredictionData.value && !!$energyPredictionData.value
    );

    const $result = useSignal<
      | FunctionalityMethodInvocationExResult<
        ProsodyGeneratorGenerateProsodyOutput
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
        {
          phonemeSegments: $validSegsData.value!,
          featurePredictions: {
            duration: $durationPredictionData.value!,
            pitch: $pitchPredictionData.value!,
            energy: $energyPredictionData.value!,
          },
        },
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
              <JsonTextarea
                placeholder="[…]"
                initialTextValue=""
                onInputDataOrNullIfInvalid={(v) => $validSegsData.value = v}
                dataSchemata={z.array(PhonemeSegment)}
              />
            </fieldset>
            <FieldsetFeaturePredictionDuration
              $predictionData={$durationPredictionData}
            />
            <FieldsetFeaturePredictionPitch
              $predictionData={$pitchPredictionData}
            />
            <FieldsetFeaturePredictionEnergy
              $predictionData={$energyPredictionData}
            />
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
