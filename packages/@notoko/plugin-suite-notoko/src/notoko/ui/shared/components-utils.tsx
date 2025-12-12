import * as _ from "es-toolkit";

import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  type Setter,
  Show,
} from "solid-js";

import type { Language, PhonemeLexicon } from "@notoko/definitions";

export const NumberInputThatCanBeFallbackToTextInput: Component<{
  step?: number;
  min?: number;
  value: number;
  set$value: (val: number) => void;
}> = ($props) => {
  const [$isFallbacking, set$isFallbacking] = createSignal(false);

  return (
    <div class="flex gap-2">
      <Show
        when={!$isFallbacking()}
        fallback={
          <input
            type="text"
            class="input input-md"
            value={$props.value}
            onInput={(ev) => $props.set$value(Number(ev.target.value))}
          />
        }
      >
        <input
          type="number"
          class="input input-md"
          step={$props.step}
          min={$props.min}
          value={$props.value}
          onInput={(ev) => $props.set$value(Number(ev.target.value))}
        />
      </Show>
      <label class="label">
        <input
          type="checkbox"
          class="checkbox"
          checked={$isFallbacking()}
          onChange={(ev) => set$isFallbacking(ev.currentTarget.checked)}
        />
        fallback to text input
      </label>
    </div>
  );
};

/**
 * When the JSON text is not valid, `set$validData` is called with `null`.
 */
export const JsonTextarea: Component<{
  placeholder: string;
  set$validData: (data: any | null) => void;
}> = ($props) => {
  const [$jsonText, set$jsonText] = createSignal("");
  createEffect(() => {
    try {
      $props.set$validData(JSON.parse($jsonText()));
    } catch {
      $props.set$validData(null);
    }
  });

  return (
    <textarea
      class="textarea w-full h-24"
      placeholder={$props.placeholder}
      value={$jsonText()}
      onInput={(ev) => set$jsonText(ev.target.value)}
    >
    </textarea>
  );
};

export const LanguageAndPhonemeLexiconSelector: Component<{
  selectedLanguage: Language | null;
  set$selectedLanguage: Setter<Language | null>;
  supportedLanguageAndPhonemeLexiconCombinations: readonly {
    language: Language;
    phonemeLexicon: PhonemeLexicon;
  }[];
  selectedPhonemeLexicon: PhonemeLexicon | null;
  set$selectedPhonemeLexicon: Setter<PhonemeLexicon | null>;
}> = ($props) => {
  const $selectablePhonemeLexica = createMemo(() => {
    const scripts = $props.supportedLanguageAndPhonemeLexiconCombinations
      .filter((c) => c.language === $props.selectedLanguage)
      .map((c) => c.phonemeLexicon);
    return _.uniq(scripts);
  });
  createEffect(() => {
    const first = $selectablePhonemeLexica().at(0);
    $props.set$selectedPhonemeLexicon(first ?? null);
  });

  return (
    <div class="flex gap-4">
      <select
        class="select select-sm w-fit"
        onInput={(ev) => $props.set$selectedLanguage(ev.target.value as any)}
      >
        <option disabled selected={!$props.selectedLanguage}>
          Language (ISO 639-3)
        </option>
        <For each={$props.supportedLanguageAndPhonemeLexiconCombinations}>
          {(c) => (
            <option
              value={c.language}
              selected={$props.selectedLanguage === c.language}
            >
              {c.language}
            </option>
          )}
        </For>
      </select>
      <Show when={$selectablePhonemeLexica().length}>
        <select
          class="select select-sm w-fit"
          onInput={(ev) =>
            $props.set$selectedPhonemeLexicon(ev.target.value as any)}
        >
          <option disabled>Phoneme Lexica</option>
          <For each={$selectablePhonemeLexica()}>
            {(phonemeLexicon) => (
              <option
                value={phonemeLexicon}
                selected={$props.selectedPhonemeLexicon === phonemeLexicon}
              >
                {phonemeLexicon}
              </option>
            )}
          </For>
        </select>
      </Show>
    </div>
  );
};
