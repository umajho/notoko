import { type Component, createSignal, For, Show } from "solid-js";
import { VsArrowRight } from "solid-icons/vs";

import type {
  FunctionalityMethodDemonstratorContext,
  FunctionalityMethodInvocationExResult,
  LanguageWithScript,
  PhonemeLexicon,
} from "@notoko/definitions";

import type {
  PhonemizerPhonemizeInput,
  PhonemizerPhonemizeOutput,
  PhonemizerPhonemizeSpecifier,
  PhonemizerSpecification,
} from "../definitions";

const DemonstratorPhonemizerPhonemize: Component<{
  specification: PhonemizerSpecification;
  invoke: (
    specifier: PhonemizerPhonemizeSpecifier,
    input: PhonemizerPhonemizeInput,
  ) => Promise<
    FunctionalityMethodInvocationExResult<PhonemizerPhonemizeOutput>
  >;
  context: FunctionalityMethodDemonstratorContext;
}> = ($props) => {
  const [$selectedLang, set$selectedLanguage] = createSignal<
    LanguageWithScript | null
  >($props.specification.supportedLanguages[0] ?? null);
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(
      $props.specification.supportedOutputPhonemeLexica[0] ?? null,
    );
  const [$text, set$text] = createSignal<string>("");

  const [$result, set$result] = createSignal<
    | FunctionalityMethodInvocationExResult<PhonemizerPhonemizeOutput>
    | null
    | "processing"
  >(null);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($result() === "processing") return;
    set$result("processing");
    set$result(
      await $props.invoke({
        language: $selectedLang()!,
        outputPhonemeLexicon: $selectedPhonemeLexicon()!,
      }, { text: $text() }),
    );
  }

  const InvocationJsonResultDisplayer = $props
    .context.makeInvocationJsonResultDisplayer();

  return (
    <div class="flex flex-col">
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
                <For each={$props.specification.supportedLanguages}>
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
                each={$props.specification.supportedOutputPhonemeLexica}
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

export default DemonstratorPhonemizerPhonemize;
