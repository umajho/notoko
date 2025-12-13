import { match } from "ts-pattern";

import { type FunctionComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Signal, untracked, useComputed, useSignal } from "@preact/signals";
import register from "preact-custom-element";

import type {
  FunctionalityMethodDemonstratorContextForCustomElementRegisterer,
  FunctionalityMethodInvocationExResult,
  Language,
  PhonemeLexicon,
} from "@notoflow/definitions";

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

    const $validSegsData = useSignal(null);

    const $durationMode = useSignal<"simple" | "custom">("custom");
    const $durationModeTabEntries = useComputed<ButtonTabEntry[]>(() => [
      {
        name: "Custom",
        isActive: $durationMode.value === "custom",
        isDisabled:
          $outerProps.value?.specification.durationInputSupport === "forbidden",
        onClick: () => $durationMode.value = "custom",
      },
      {
        name: "Simple",
        isActive: $durationMode.value === "simple",
        isDisabled:
          $outerProps.value?.specification.durationInputSupport === "required",
        onClick: () => $durationMode.value = "simple",
      },
    ]);

    const $speed = useSignal(1);
    const $isSpeedValid = useComputed(() => $speed.value > 0);
    const $validDurationData = useSignal(null);
    const $validDuration = useComputed(() =>
      match($durationMode.value)
        .returnType<ProsodyGeneratorGenerateProsodyInputDuration | null>()
        .with("simple", () =>
          $isSpeedValid.value ? ["simple", { speed: $speed.value }] : null)
        .with("custom", () =>
          $validDurationData.value
            ? ["custom", $validDurationData.value!]
            : null)
        .exhaustive()
    );

    const $areInputsValid = useComputed(() =>
      !!$validSegsData.value && !!$validDuration.value
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
          duration: $validDuration.value!,
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
      $durationMode.value =
        $outerProps.value.specification.durationInputSupport === "forbidden"
          ? "simple"
          : "custom";
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
            <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
              <legend class="fieldset-legend">Duration</legend>
              <ButtonTabs $tabs={$durationModeTabEntries} />
              {match($durationMode.value)
                .with("custom", () => (
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">
                      Duration Prediction
                      {(!$validDurationData.value) && (
                        <span class="text-error text-xs italic">
                          (*invalid)
                        </span>
                      )}
                    </legend>
                    <JsonTextarea
                      placeholder='{ "durationTicks2d": …, "ticksPerSecond": … }'
                      $validData={$validDurationData}
                    />
                  </fieldset>
                )).with("simple", () => (
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
                )).exhaustive()}
            </fieldset>
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
