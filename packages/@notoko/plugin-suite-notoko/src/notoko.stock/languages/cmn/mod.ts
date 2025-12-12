import * as z from "zod/v4";
import { match } from "ts-pattern";

import { addDict, pinyin } from "pinyin-pro";

// XXX: The imported file is externalized. (The file pointed here is just a
// symbol link, and the actual file will be copied to the dist folder during
// rolldown's build process via `rollup-plugin-copy`.) This is to reduce the
// build time (to not minifying a JSON weighted 16MiB).
import CompleteDict from "../../resources/pinyin-pro/dict-complete.json" with //
{ type: "json" };

// XXX: Externalized.
import fastspeech2PinyinRDataCsv from //
"../../resources/fastspeech2-pinyin-r/processed.csv.json" with { type: "json" };

import {
  type FunctionalityMethodInvocationResult,
  LanguageWithScript,
  PhonemeLexicon,
} from "@notoko/definitions";
import {
  PhonemizerPhonemizeInput,
  PhonemizerPhonemizeOutput,
  PhonemizerPhonemizeSpecifier,
  PhonemizerValidatePhonemeInput,
  PhonemizerValidatePhonemeOutput,
  PhonemizerValidatePhonemeSpecifier,
} from "../../../notoko/definitions";

addDict(CompleteDict);

const [fastspeech2PinyinRData, fastspeech2PinyinRValidPhonemes] = (() => {
  const result: Record<string, { initial: string | null; final: string }> = {};
  const validPhonemes = {
    initials: new Set<string>(),
    finals: new Set<string>(),
  };
  for (const line of fastspeech2PinyinRDataCsv.split("\n")) {
    if (!line) continue;
    let [full, initial, final] = line.split(",");
    result[full!] = {
      initial: initial ?? null,
      final: final!,
    };
    if (initial) {
      validPhonemes.initials.add(initial);
    }
    validPhonemes.finals.add(final!);
  }
  return [result, validPhonemes];
})();

const LANGUAGE_WITH_SCRIPT_MAP = {
  "cmn-Hans": LanguageWithScript.parse("cmn-Hans"),
} as const;
const PHONEME_LEXICON_MAP = {
  /**
   * `fastspeech2-pinyin-r` is the lexicon from
   * <https://github.com/ming024/FastSpeech2/blob/d4e79eb52e8b01d24703b2dfc0385544092958f3/lexicon/pinyin-lexicon-r.txt>.
   *
   * Characteristics:
   * - It breaks down a Chinese character into at most 3 phonemes:
   *   - an optional initial, (e.g. `b`)
   *   - a final with tone number, (e.g. `a1`)
   *   - and an optional erhua suffix. (`rr`)
   * - Tone numbers are ranging from `1` to `5` (where `5` the represents
   *   neutral tone).
   * - `y` and `w` are treated as initials. Finals that follow them are prefixed
   *   with `i` or `u` respectively. (e.g. `羊` -> `y` + `iang2`, `王` -> `w` +
   *   `uang2`)
   * - It does not cover `ng` for “嗯”.
   *
   * Note that although the phonemizer implemented here does not output `rr`,
   * other processing steps that claim to support this lexicon should always
   * support it, since a user can always manually put `rr` in the input.
   */
  "fastspeech2-pinyin-r": PhonemeLexicon.parse("fastspeech2-pinyin-r"),
} as const;

export const phonemizerSupportedInputLanguages: LanguageWithScript[] = [
  // TODO: `cmn-Hani`.
  // The reason only `cmn-Hans` is supported for now is because pinyin-pro only
  // supports simplified Chinese characters.
  LANGUAGE_WITH_SCRIPT_MAP["cmn-Hans"],
] as const;
export const phonemizerSupportedOutputPhonemeLexica = [
  PHONEME_LEXICON_MAP["fastspeech2-pinyin-r"],
] as const;
const PhonemizerSupportedOutputPhonemeLexicon = z
  .enum(phonemizerSupportedOutputPhonemeLexica);
type PhonemizerSupportedOutputPhonemeLexicon = //
  z.infer<typeof PhonemizerSupportedOutputPhonemeLexicon>;

export async function phonemize(
  specifier_: unknown,
  input_: unknown,
): Promise<FunctionalityMethodInvocationResult<PhonemizerPhonemizeOutput>> {
  const specifier = PhonemizerPhonemizeSpecifier.parse(specifier_);
  const input = PhonemizerPhonemizeInput.parse(input_);

  return match(specifier.language)
    .returnType<
      FunctionalityMethodInvocationResult<PhonemizerPhonemizeOutput>
    >()
    .with(LANGUAGE_WITH_SCRIPT_MAP["cmn-Hans"], () => {
      return phonemizeStandard(input.text, {
        phonemeLexicon: specifier.outputPhonemeLexicon,
      });
    })
    .otherwise(() => {
      return ["error", "custom", `unsupported language: ${specifier.language}`];
    });
}

export async function validatePhoneme(
  specifier_: unknown,
  input_: unknown,
): Promise<
  FunctionalityMethodInvocationResult<PhonemizerValidatePhonemeOutput>
> {
  const specifier = PhonemizerValidatePhonemeSpecifier.parse(specifier_);
  const input = PhonemizerValidatePhonemeInput.parse(input_);

  switch (specifier.phonemeLexicon) {
    case PHONEME_LEXICON_MAP["fastspeech2-pinyin-r"]: {
      if (
        input.phoneme === "rr" ||
        fastspeech2PinyinRValidPhonemes.initials.has(input.phoneme) ||
        (/[1-5]/.test(input.phoneme.slice(-1)) &&
          fastspeech2PinyinRValidPhonemes
            .finals.has(input.phoneme.slice(0, -1)))
      ) {
        return ["ok", { isValid: true }];
      }
      return ["ok", { isValid: false }];
    }
    default:
      return [
        "error",
        "custom",
        `unsupported phoneme lexicon: ${specifier.phonemeLexicon}`,
      ];
  }
}

function phonemizeStandard(
  text: string,
  opts: { phonemeLexicon: PhonemizerSupportedOutputPhonemeLexicon },
): ["ok", PhonemizerPhonemizeOutput] {
  switch (opts.phonemeLexicon) {
    case "fastspeech2-pinyin-r":
      const segs = pinyin(text, { toneType: "num", type: "all" })
        .map(({ pinyin: pinyinWithTone, origin }) => {
          if (!pinyinWithTone) return { text: origin, phonemes: ["sp"] };

          const pinyin = pinyinWithTone.slice(0, -1)!;
          const tone = pinyinWithTone.at(-1)!;

          switch (pinyin) { // special casing.
            case "ng":
              // Unfortunately, `fastspeech2-pinyin-r` does not cover `ng`, so
              // we have to map it to `en` here. We will special-case this in
              // notoko-sync. Pseudo code of such special-casing in Elixir:
              //
              // ``` elixir
              // case seg do
              //   # Tones are removed before, so `x` is toneless.
              //   %{phonemes: [x], text: text } when x == "en" ->
              //     case text, do: ("嗯" -> ":n"; _ -> "@ :n")
              //   # …
              // end
              // ```
              return { text: origin, phonemes: ["en" + tone] };
            case "ar":
              // pinyin-pro converts `二` to `ar4`, whereas FastSpeech2's
              // phonemizer converts `二` to `er4`, and does not recognize
              // `ar4`. (it only recognizes `er4` and `a4 rr`. the later one
              // doesn't seem to be trained enough, leading to weird pitch
              // results.) Although `ar4` sounds more accurate to me, I have to
              // covert it to `er4` here. Though, as before, we will special-
              // case this in notoko-sync. Pseudo code of such special-casing in
              // Elixir:
              //
              // ``` elixir
              // case seg do
              //   # Tones are removed before, so `x` is toneless.
              //   %{phonemes: [x], text: text } when x == "er" ->
              //     # Yeah, “二” is not the one paired with `a …`.
              //     case text, do: ("二" -> "@ r\\`", _ -> "a r\\`")
              // end
              // ```
              return { text: origin, phonemes: ["er" + tone] };
          }

          let { initial, final } = fastspeech2PinyinRData[pinyin]!;
          const fsTone = tone === "0" ? "5" : tone;
          final += fsTone;
          const phonemes: string[] = [];
          if (initial) {
            phonemes.push(initial);
          }
          phonemes.push(final);

          return { text: origin, phonemes };
        });
      return ["ok", { phonemeSegments: segs }];
    default:
      // opts.phonemeLexicon satisfies never; // FIXME
      throw new Error("unreachable!");
  }
}
