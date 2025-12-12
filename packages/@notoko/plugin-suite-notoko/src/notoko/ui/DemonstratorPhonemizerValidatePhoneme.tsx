import { type FunctionComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { type Signal, useSignal } from "@preact/signals";
import register from "preact-custom-element";

import type {
  FunctionalityMethodDemonstratorContextForCustomElementRegisterer,
  FunctionalityMethodInvocationExResult,
  PhonemeLexicon,
} from "@notoko/definitions";

import type {
  PhonemizerSpecification,
  PhonemizerValidatePhonemeInput,
  PhonemizerValidatePhonemeOutput,
  PhonemizerValidatePhonemeSpecifier,
} from "../definitions";

export default function (tagName: string) {
  register(DemonstratorPhonemizerValidatePhoneme, tagName, [], {
    shadow: false,
  });
}

const DemonstratorPhonemizerValidatePhoneme: FunctionComponent<{}> = () => {
  const $outerProps: Signal<
    {
      specification: PhonemizerSpecification;
      invoke: (
        specifier: PhonemizerValidatePhonemeSpecifier,
        input: PhonemizerValidatePhonemeInput,
      ) => Promise<
        FunctionalityMethodInvocationExResult<PhonemizerValidatePhonemeOutput>
      >;
      context: FunctionalityMethodDemonstratorContextForCustomElementRegisterer;
    } | null
  > = useSignal(null);

  const $selectedPhonemeLexicon = useSignal<PhonemeLexicon | null>(null);
  const $inputPhoneme = useSignal<any>("");

  const $result = useSignal<
    | FunctionalityMethodInvocationExResult<
      PhonemizerValidatePhonemeOutput
    >
    | null
  >(null);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($result.value === "processing") return;
    $result.value = "processing";
    $result.value = await $outerProps.value!.invoke(
      { phonemeLexicon: $selectedPhonemeLexicon.value! },
      { phoneme: $inputPhoneme.value },
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
    $selectedPhonemeLexicon.value = $outerProps.value.specification
      .supportedOutputPhonemeLexica[0] ?? null;
    $invocationJsonResultDisplayerTagName.value = $outerProps.value
      .context.getInvocationJsonResultDisplayerTagName();
  }, []);

  return (
    <div ref={ref} class="flex flex-col">
      <form onSubmit={handleSubmit}>
        <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
          <legend class="fieldset-legend">Input</legend>
          <div class="join w-full">
            {$outerProps.value
              ? (
                <select
                  class="join-item select w-fit"
                  onInput={(ev) =>
                    $selectedPhonemeLexicon.value = ev.currentTarget
                      .value as any}
                >
                  <option disabled selected={!$selectedPhonemeLexicon.value}>
                    Phoneme Lexicon
                  </option>
                  {$outerProps.value.specification.supportedOutputPhonemeLexica
                    .map((format) => (
                      <option
                        value={format}
                        selected={$selectedPhonemeLexicon.value === format}
                      >
                        {format}
                      </option>
                    ))}
                </select>
              )
              : <>TODO: LOADING</>}

            <label class="floating-label w-full">
              <span>Phoneme</span>
              <input
                type="text"
                placeholder="Phoneme"
                class="join-item input input-md w-full"
                value={$inputPhoneme.value}
                onInput={(ev) => $inputPhoneme.value = ev.currentTarget.value}
              />
            </label>
            <input type="submit" class="join-item btn btn-primary">
              Submit
            </input>
          </div>
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
