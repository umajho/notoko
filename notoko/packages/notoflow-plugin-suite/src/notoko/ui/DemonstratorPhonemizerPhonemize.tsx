import { type FunctionComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { type Signal, useSignal } from "@preact/signals";
import register from "preact-custom-element";

import type {
  FunctionalityMethodDemonstratorContextForCustomElementRegisterer,
  FunctionalityMethodInvocationExResult,
  LanguageWithScript,
  PhonemeLexicon,
} from "@notoflow/definitions";

import type {
  PhonemizerPhonemizeInput,
  PhonemizerPhonemizeOutput,
  PhonemizerPhonemizeSpecifier,
  PhonemizerSpecification,
} from "../definitions";
import { LanguageWithScriptAndPhonemeLexiconSelector } from "./shared/components-utils";

export default function (tagName: string) {
  register(DemonstratorPhonemizerPhonemize, tagName, [], {
    shadow: false,
  });
}

const DemonstratorPhonemizerPhonemize: FunctionComponent<{}> = ($props) => {
  const $outerProps: Signal<
    {
      specification: PhonemizerSpecification;
      invoke: (
        specifier: PhonemizerPhonemizeSpecifier,
        input: PhonemizerPhonemizeInput,
      ) => Promise<
        FunctionalityMethodInvocationExResult<PhonemizerPhonemizeOutput>
      >;
      context: FunctionalityMethodDemonstratorContextForCustomElementRegisterer;
    } | null
  > = useSignal(null);

  const $selectedLanguage = useSignal<LanguageWithScript | null>(null);
  const $selectedPhonemeLexicon = useSignal<PhonemeLexicon | null>(null);
  const $text = useSignal("");

  const $result = useSignal<
    | FunctionalityMethodInvocationExResult<
      PhonemizerPhonemizeOutput
    >
    | null
  >(null);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($result.value === "processing") return;
    $result.value = "processing";
    $result.value = await $outerProps.value!.invoke({
      language: $selectedLanguage.value!,
      outputPhonemeLexicon: $selectedPhonemeLexicon.value!,
    }, { text: $text.value });
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
      .supportedLanguages[0] ?? null;
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
          <div class="flex justify-between">
            {$outerProps.value
              ? (
                <LanguageWithScriptAndPhonemeLexiconSelector
                  supportedLanguages={$outerProps
                    .value
                    .specification
                    .supportedLanguages}
                  supportedPhonemeLexica={$outerProps
                    .value
                    .specification
                    .supportedOutputPhonemeLexica}
                  $selectedLanguage={$selectedLanguage}
                  $selectedPhonemeLexicon={$selectedPhonemeLexicon}
                />
              )
              : <>TODO: LOADING</>}
          </div>
          <div class="join w-full">
            <label class="floating-label w-full">
              <span>Text</span>
              <input
                type="text"
                placeholder="Text"
                class="join-item input input-md w-full"
                value={$text.value}
                onInput={(ev) => $text.value = ev.currentTarget.value}
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
