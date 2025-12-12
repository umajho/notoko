import { type Component, createSignal, For, Show } from "solid-js";

import type {
  FunctionalityMethodDemonstratorContext,
  FunctionalityMethodInvocationExResult,
  PhonemeLexicon,
} from "@notoko/definitions";

import type {
  PhonemizerSpecification,
  PhonemizerValidatePhonemeInput,
  PhonemizerValidatePhonemeOutput,
  PhonemizerValidatePhonemeSpecifier,
} from "../definitions";

const DemonstratorPhonemizerValidatePhoneme: Component<{
  specification: PhonemizerSpecification;
  invoke: (
    specifier: PhonemizerValidatePhonemeSpecifier,
    input: PhonemizerValidatePhonemeInput,
  ) => Promise<
    FunctionalityMethodInvocationExResult<PhonemizerValidatePhonemeOutput>
  >;
  context: FunctionalityMethodDemonstratorContext;
}> = ($props) => {
  const [$selectedPhonemeLexicon, set$selectedPhonemeLexicon] = //
    createSignal<PhonemeLexicon | null>(
      $props.specification.supportedOutputPhonemeLexica[0] ?? null,
    );
  const [$inputPhoneme, set$inputPhoneme] = createSignal<any>("");

  const [$result, set$result] = createSignal<
    | FunctionalityMethodInvocationExResult<PhonemizerValidatePhonemeOutput>
    | null
  >(null);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if ($result() === "processing") return;
    set$result("processing");
    set$result(
      await $props.invoke(
        { phonemeLexicon: $selectedPhonemeLexicon()! },
        { phoneme: $inputPhoneme() },
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

export default DemonstratorPhonemizerValidatePhoneme;
