import * as z from "zod/v4";
import {
  Duration2d,
  type Language,
  LanguageWithScript,
  PhonemeLexicon,
  type PhonemeSegment,
} from "./common";

export type Functionality =
  | FunctionalityPhonemizer
  | FunctionalityDurationPredictor
  | FunctionalityProsodyGenerator;

export type FunctionalityBase = {
  info: {
    shownName: string;
  };
};

export type FunctionalityPhonemizer = FunctionalityBase & {
  type: "functionality:phonemizer";
  info: {
    associatedType: "functionality:phonemizer";
    specification: {
      supportedLanguages: readonly LanguageWithScript[];
      supportedOutputPhonemeLexica: readonly PhonemeLexicon[];
    };
  };
  phonemize: (
    specifier: {
      language: LanguageWithScript;
      outputPhonemeLexicon: PhonemeLexicon;
    },
    input: { text: string },
  ) => Promise<PhonemizeResult>;
  /**
   * FIXME: `language: Language` should also be in `spec`.
   */
  isValidPhoneme(
    specifier: { phonemeLexicon: PhonemeLexicon },
    input: { phoneme: string },
  ): IsValidPhonemeResult;
};

export type PhonemizeResult =
  | ["ok", PhonemeSegment[]]
  | ["error", "unsupported_input_language"]
  | ["error", "unsupported_output_phoneme_lexicon"]
  | ["error", "custom", Error];
export type IsValidPhonemeResult =
  | ["ok", boolean]
  | ["error", "unsupported_phoneme_lexicon"];

export type FunctionalityDurationPredictor = FunctionalityBase & {
  type: "functionality:duration_predictor";
  info: {
    associatedType: "functionality:duration_predictor";
    specification: {
      supportedLanguageAndPhonemeLexiconCombinations: readonly {
        language: Language;
        phonemeLexicon: PhonemeLexicon;
      }[];
    };
  };
  predictDuration: (
    specifier: { language: Language; phonemeLexicon: PhonemeLexicon },
    input: {
      phonemeSegments: PhonemeSegment[];
      speed?: number;
    },
  ) => Promise<DurationPredictResult>;
};

export type DurationPredictResult =
  | ["ok", DurationPrediction]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_phoneme_lexicon",
  ]
  | ["error", "custom", Error];
export const DurationPrediction = z
  .object({
    durationTicks2d: Duration2d,
    ticksPerSecond: z.number().int().positive(),
  });
export type DurationPrediction = z.infer<typeof DurationPrediction>;

export const DurationInput = z.enum(["required", "optional", "forbidden"]);
export type DurationInput = z.infer<typeof DurationInput>;

export type FunctionalityProsodyGenerator = FunctionalityBase & {
  type: "functionality:prosody_generator";
  info: {
    associatedType: "functionality:prosody_generator";
    specification: {
      supportedLanguageAndPhonemeLexiconCombinations: readonly {
        language: Language;
        phonemeLexicon: PhonemeLexicon;
      }[];
      durationInput: DurationInput;
    };
  };
  generateProsody: (
    specifier: { language: Language; phonemeLexicon: PhonemeLexicon },
    input: {
      phonemeSegments: PhonemeSegment[];
      duration:
        | ["simple", { speed?: number }]
        | ["custom", DurationPrediction];
    },
  ) => Promise<ProsodyGenerateResult>;
};

export type ProsodyGenerateResult =
  | ["ok", any /* TODO: typing */]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_phoneme_lexicon",
  ]
  | ["error", "custom", Error];
export const ProsodyData = z.discriminatedUnion("$schema", [
  z.object({
    "$schema": z.enum([
      "https://raw.githubusercontent.com/umajho/notoko/main/schemata/notoko-prosody-data.v1.json",
      "https://raw.githubusercontent.com/umajho/notoko/main/schemata/permanent/notoko-prosody-data/v1/notoko-prosody-data.v1_0_0.json",
      "https://raw.githubusercontent.com/umajho/notoko/main/schemata/permanent/notoko-prosody-data/v1/notoko-prosody-data.v1_0_1.json",
    ]),
    defaultLanguage: z.enum(["english", "mandarin"]),
    ticksPerSecond: z.number().int().positive(),
    segments: z.array(z.any()), // TODO: typing.
    actualPitches: z.object({
      ticksPerPoint: z.number().int().positive(),
      pointsPackedV1: z.base64(),
    }),
  }),
]);
export type ProsodyData = z.infer<typeof ProsodyData>;
