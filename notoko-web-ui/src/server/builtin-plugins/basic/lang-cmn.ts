import * as z from "zod/v4";
import { match } from "ts-pattern";

import { addDict, pinyin } from "pinyin-pro";
import CompleteDict from "@pinyin-pro/data/complete";

import fastspeech2PinyinRDataCsv from "./data/fastspeech2-pinyin-r/processed.csv?raw";

import type {
  IsValidPhonemeResult,
  LanguageSpecifierWithScript,
  PhonemeSegment,
  PhonemizeResult,
} from "~/definitions.mod";

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

export const phonemizerSupportedInputLanguages: LanguageSpecifierWithScript[] =
  [
    { "iso639-3": "cmn", script: { "iso15924": "Hans" } },
  ];
export const phonemizerSupportedOutputSegmentationFormats = [
  /**
   * `fastspeech2-pinyin-r` is the format from
   * <https://github.com/ming024/FastSpeech2>.
   *
   * characteristics of `fastspeech2-pinyin-r`:
   * - `y` and `w` are treated as initials.
   *   - `羊` -> `y` + `iang2`, `王` -> `w` + `uang2`.
   * - `"rr"` represents the erhua suffix. The phonemizer will never output this
   *   phoneme, but the user can alter the output to add it.
   * - does not cover: `ng`.
   *
   * additional characteristics of `fastspeech2-pinyin-r?tones`:
   * - each segment: `[<initial>?, <final><tone>, "rr"?]`.
   * - `<tone>` is `1`~`5`, where `5` represents neutral tone.
   */
  "fastspeech2-pinyin-r?tones",
] as const;
const PhonemizerSupportedOutputSegmentationFormats = z
  .enum(phonemizerSupportedOutputSegmentationFormats);
type PhonemizerSupportedOutputSegmentationFormat = //
  z.infer<typeof PhonemizerSupportedOutputSegmentationFormats>;

export async function phonemize(
  lang: LanguageSpecifierWithScript,
  text: string,
  opts: { outputSegmentationFormat: string },
): Promise<PhonemizeResult> {
  const segFormatResult = PhonemizerSupportedOutputSegmentationFormats
    .safeParse(opts.outputSegmentationFormat);
  if (!segFormatResult.success) {
    return ["error", "unsupported_output_segmentation_format"];
  }

  return match(lang)
    .returnType<PhonemizeResult>()
    .with({ "iso639-3": "cmn" }, () => {
      return phonemizeStandard(text, { segFormat: segFormatResult.data });
    })
    .otherwise(() => {
      return ["error", "unsupported_input_language"];
    });
}

export function isValidPhoneme(
  segmentationFormat: string,
  phoneme: string,
): IsValidPhonemeResult {
  const segFormatResult = PhonemizerSupportedOutputSegmentationFormats
    .safeParse(segmentationFormat);
  if (!segFormatResult.success) {
    return ["error", "unsupported_segmentation_format"];
  }

  switch (segFormatResult.data) {
    case "fastspeech2-pinyin-r?tones": {
      if (
        phoneme === "rr" ||
        fastspeech2PinyinRValidPhonemes.initials.has(phoneme) ||
        (/[1-5]/.test(phoneme.slice(-1)) && fastspeech2PinyinRValidPhonemes
          .finals.has(phoneme.slice(0, -1)))
      ) {
        return ["ok", true];
      }
      return ["ok", false];
    }
    default:
      segFormatResult satisfies never;
      throw new Error("unreachable!");
  }
}

function phonemizeStandard(
  text: string,
  opts: { segFormat: PhonemizerSupportedOutputSegmentationFormat },
): ["ok", PhonemeSegment[]] {
  switch (opts.segFormat) {
    case "fastspeech2-pinyin-r?tones":
      const segs = pinyin(text, { toneType: "num", type: "all" })
        .map(({ pinyin: pinyinWithTone, origin }) => {
          if (!pinyinWithTone) return { text: origin, phonemes: ["sp"] };

          const pinyin = pinyinWithTone.slice(0, -1)!;
          const tone = pinyinWithTone.at(-1)!;

          switch (pinyin) { // special casing.
            case "ng":
              // Unfortunately, `fastspeech2-pinyin-r` does not cover `ng`, so
              // we have to map it to `en` here. We will special-case this in
              // notoko-sync. (for `嗯`: `en` -> `:n` instead of `@ :n`.)
              return { text: origin, phonemes: ["en" + tone] };
            case "ar":
              // pinyin-pro converts `二` to `ar4`, whereas FastSpeech2's
              // phonemizer converts `二` to `er4`, and does not recognize
              // `ar4`. (it only recognizes `er4` and `a4 rr`. the later one
              // doesn't seem to be trained enough, leading to weird pitch
              // results.) Although `ar4` sounds more accurate to me, I have to
              // covert it to `er4` here. Though, as before, we will special-
              // case this in notoko-sync. (for everthing other than `二`: `er4`
              // -> `` @ r\` `` instead of `` a r\` ``.)
              return { text: origin, phonemes: ["er" + tone] };
          }

          let { initial, final } = fastspeech2PinyinRData[pinyin]!;
          const fsTone = tone === "0" ? "5" : tone;
          final += fsTone;
          const phonemes = [];
          if (initial) {
            phonemes.push(initial);
          }
          phonemes.push(final);

          return { text: origin, phonemes };
        });
      return ["ok", segs];
    default:
      opts.segFormat satisfies never;
      throw new Error("unreachable!");
  }
}
