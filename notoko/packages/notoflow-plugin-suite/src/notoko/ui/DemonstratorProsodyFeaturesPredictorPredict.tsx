import { match, P } from "ts-pattern";
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
  type ProsodyFeaturesPredictorPredictInput,
  type ProsodyFeaturesPredictorPredictOutput,
  type ProsodyFeaturesPredictorPredictSpecifier,
  type ProsodyFeaturesPredictorSpecification,
} from "../definitions";

import {
  JsonTextarea,
  LanguageAndPhonemeLexiconSelector,
} from "./shared/components-utils";
import {
  FieldsetPredictFeatureOptionsDuration,
  FieldsetPredictFeatureOptionsEnergy,
  FieldsetPredictFeatureOptionsPitch,
} from "./shared/components-fieldsets";

export default function (tagName: string) {
  register(DemonstratorProsodyFeaturesPredictorPredict, tagName, [], {
    shadow: false,
  });
}

const DemonstratorProsodyFeaturesPredictorPredict: FunctionComponent<{}> =
  () => {
    const $outerProps: Signal<
      {
        specification: ProsodyFeaturesPredictorSpecification;
        invoke: (
          specifier: ProsodyFeaturesPredictorPredictSpecifier,
          input: ProsodyFeaturesPredictorPredictInput,
        ) => Promise<
          FunctionalityMethodInvocationExResult<
            ProsodyFeaturesPredictorPredictOutput
          >
        >;
        context:
          FunctionalityMethodDemonstratorContextForCustomElementRegisterer;
      } | null
    > = useSignal(null);

    const $selectedLanguage = useSignal<Language | null>(null);
    const $selectedPhonemeLexicon = useSignal<PhonemeLexicon | null>(null);

    const $validSegsData = useSignal<PhonemeSegment[] | null>(null);

    const $durationOptions = useSignal<
      ["speed", number] | ["override", DurationPrediction] | "invalid"
    >("invalid");
    const $pitchOptions = useSignal<
      ["simple", number] | ["override", PitchPrediction] | "invalid"
    >("invalid");
    const $energyOptions = useSignal<
      ["simple", number] | ["override", EnergyPrediction] | "invalid"
    >("invalid");

    const $areInputsValid = useComputed(() =>
      !!$validSegsData.value && $durationOptions.value !== "invalid" &&
      $pitchOptions.value !== "invalid" && $energyOptions.value !== "invalid"
    );

    const $result = useSignal<
      | FunctionalityMethodInvocationExResult<
        ProsodyFeaturesPredictorPredictOutput
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
          featurePredictionOverrides: {
            duration: match($durationOptions.value)
              .with(["override", P.select()], (v) => v)
              .otherwise(() => undefined),
            pitch: match($pitchOptions.value)
              .with(["override", P.select()], (v) => v)
              .otherwise(() => undefined),
            energy: match($energyOptions.value)
              .with(["override", P.select()], (v) => v)
              .otherwise(() => undefined),
          },
          controls: {
            speed: match($durationOptions.value)
              .with(["speed", P.select()], (v) => v)
              .otherwise(() => undefined),
            pitch: match($pitchOptions.value)
              .with(["simple", P.select()], (v) => v)
              .otherwise(() => undefined),
            energy: match($energyOptions.value)
              .with(["simple", P.select()], (v) => v)
              .otherwise(() => undefined),
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
            <FieldsetPredictFeatureOptionsDuration
              featurePredictionOverrideSupport="optional" // TODO
              $options={$durationOptions}
            />
            <FieldsetPredictFeatureOptionsPitch
              featurePredictionOverrideSupport="optional" // TODO
              $options={$pitchOptions}
            />
            <FieldsetPredictFeatureOptionsEnergy
              featurePredictionOverrideSupport="optional" // TODO
              $options={$energyOptions}
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
