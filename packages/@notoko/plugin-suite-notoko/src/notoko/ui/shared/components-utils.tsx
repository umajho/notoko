import * as _ from "es-toolkit";

import { Fragment, type FunctionComponent } from "preact";
import {
  type Signal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";

import {
  Language,
  LanguageWithScript,
  PhonemeLexicon,
} from "@notoko/definitions";

export const NumberInputThatCanBeFallbackToTextInput: FunctionComponent<{
  step?: number;
  min?: number;
  $value: Signal<number>;
}> = (props) => {
  const $isFallbacking = useSignal(false);

  return (
    <div class="flex gap-2">
      {$isFallbacking.value
        ? (
          <input
            type="number"
            class="input input-md"
            step={props.step}
            min={props.min}
            value={props.$value.value}
            onInput={(ev) =>
              props.$value.value = Number(ev.currentTarget.value)}
          />
        )
        : (
          <input
            type="text"
            class="input input-md"
            value={props.$value.value}
            onInput={(ev) =>
              props.$value.value = Number(ev.currentTarget.value)}
          />
        )}

      <label class="label">
        <input
          type="checkbox"
          class="checkbox"
          checked={$isFallbacking.value}
          onInput={(ev) => $isFallbacking.value = ev.currentTarget.checked}
        />
        fallback to text input
      </label>
    </div>
  );
};

/**
 * When the JSON text is not valid, `set$validData` is called with `null`.
 */
export const JsonTextarea: FunctionComponent<{
  placeholder: string;
  $validData: Signal<any>;
}> = (props) => {
  const $jsonText = useSignal("");
  useSignalEffect(() => {
    try {
      props.$validData.value = JSON.parse($jsonText.value);
    } catch {
      props.$validData.value = null;
    }
  });

  return (
    <textarea
      class="textarea w-full h-24"
      placeholder={props.placeholder}
      value={$jsonText.value}
      onInput={(ev) => $jsonText.value = ev.currentTarget.value}
    >
    </textarea>
  );
};

export const LanguageAndPhonemeLexiconSelector: FunctionComponent<{
  $selectedLanguage: Signal<Language | null>;
  supportedLanguageAndPhonemeLexiconCombinations: readonly {
    language: Language;
    phonemeLexicon: PhonemeLexicon;
  }[];
  $selectedPhonemeLexicon: Signal<PhonemeLexicon | null>;
}> = (props) => {
  const $selectablePhonemeLexica = useComputed(() => {
    const scripts = props.supportedLanguageAndPhonemeLexiconCombinations
      .filter((c) => c.language === props.$selectedLanguage.value)
      .map((c) => c.phonemeLexicon);
    return _.uniq(scripts);
  });
  useSignalEffect(() => {
    const first = $selectablePhonemeLexica.value.at(0);
    props.$selectedPhonemeLexicon.value = first ?? null;
  });

  return (
    <div class="flex gap-4">
      <select
        class="select select-sm w-fit"
        onInput={(ev) =>
          props.$selectedLanguage.value = Language
            .parse(ev.currentTarget.value)}
      >
        <option disabled selected={!props.$selectedLanguage.value}>
          Language (ISO 639-3)
        </option>
        {props.supportedLanguageAndPhonemeLexiconCombinations.map((c) => (
          <Fragment key={c.language}>
            <option
              value={c.language}
              selected={props.$selectedLanguage.value === c.language}
            >
              {c.language}
            </option>
          </Fragment>
        ))}
      </select>
      {$selectablePhonemeLexica.value.length &&
        (
          <select
            class="select select-sm w-fit"
            onInput={(ev) =>
              props.$selectedPhonemeLexicon.value = PhonemeLexicon
                .parse(ev.currentTarget.value)}
          >
            <option disabled>Phoneme Lexica</option>
            {$selectablePhonemeLexica.value.map((phonemeLexicon) => (
              <Fragment key={phonemeLexicon}>
                <option
                  value={phonemeLexicon}
                  selected={props.$selectedPhonemeLexicon.value ===
                    phonemeLexicon}
                >
                  {phonemeLexicon}
                </option>
              </Fragment>
            ))}
          </select>
        )}
    </div>
  );
};

/**
 * TODO: merge with `LanguageAndPhonemeLexiconSelector`?
 */
export const LanguageWithScriptAndPhonemeLexiconSelector: FunctionComponent<{
  supportedLanguages: LanguageWithScript[];
  supportedPhonemeLexica: PhonemeLexicon[];
  $selectedLanguage: Signal<LanguageWithScript | null>;
  $selectedPhonemeLexicon: Signal<PhonemeLexicon | null>;
}> = (props) => {
  return (
    <>
      <select
        class="select select-sm w-fit"
        onInput={(ev) =>
          props.$selectedLanguage.value = LanguageWithScript
            .parse(ev.currentTarget.value)}
      >
        <option disabled selected={!props.$selectedLanguage.value}>
          {"Language-Script (<ISO 639-3>-<ISO 15924>)"}
        </option>
        {props.supportedLanguages.map((language) => (
          <Fragment key={language}>
            <option
              value={language}
              selected={props.$selectedLanguage.value === language}
            >
              {language}
            </option>
          </Fragment>
        ))}
      </select>
      <div class="m-auto">➡️</div>
      <select
        class="select select-sm w-fit"
        onInput={(ev) =>
          props.$selectedPhonemeLexicon.value = PhonemeLexicon
            .parse(ev.currentTarget.value)}
      >
        <option disabled selected={!props.$selectedLanguage.value}>
          Phoneme Lexicon
        </option>
        {props.supportedPhonemeLexica.map((phonemeLexicon) => (
          <Fragment key={phonemeLexicon}>
            <option
              value={phonemeLexicon}
              selected={props.$selectedPhonemeLexicon.value ===
                phonemeLexicon}
            >
              {phonemeLexicon}
            </option>
          </Fragment>
        ))}
      </select>
    </>
  );
};
