import type {
  Duration2d,
  LanguageSpecifier,
  LanguageSpecifierWithSegmentationFormat,
  PhonemeSegment,
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
    supportedInputLanguages: readonly LanguageSpecifier[];
    supportedOutputSegmentationFormats: readonly string[];
  };
  phonemize: (
    lang: LanguageSpecifier,
    text: string,
    opts: { outputSegmentationFormat: string },
  ) => Promise<PhonemizeResult>;
  isValidPhoneme(
    segmentationFormat: string,
    phoneme: string,
  ): IsValidPhonemeResult;
};

export type PhonemizeResult =
  | ["ok", PhonemeSegment[]]
  | ["error", "unsupported_input_language"]
  | ["error", "unsupported_output_segmentation_format"]
  | ["error", "custom", Error];
export type IsValidPhonemeResult =
  | ["ok", boolean]
  | ["error", "unsupported_segmentation_format"];

export type FunctionalityDurationPredictor = FunctionalityBase & {
  type: "functionality:duration_predictor";
  info: {
    associatedType: "functionality:duration_predictor";
    supportedInputLanguages: readonly LanguageSpecifierWithSegmentationFormat[];
  };
  predictDuration: (
    lang: LanguageSpecifierWithSegmentationFormat,
    phonemeSegments: PhonemeSegment[],
  ) => Promise<DurationPredictResult>;
};

export type DurationPredictResult =
  | ["ok", Duration2d]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_language_segmentation_format",
  ]
  | ["error", "custom", Error];

export type FunctionalityProsodyGenerator = FunctionalityBase & {
  type: "functionality:prosody_generator";
  info: {
    associatedType: "functionality:prosody_generator";
    supportedInputLanguages: readonly LanguageSpecifierWithSegmentationFormat[];
  };
  generateProsody: (
    lang: LanguageSpecifierWithSegmentationFormat,
    input: { phonemeSegments: PhonemeSegment[]; duration2d?: Duration2d },
  ) => Promise<ProsodyGenerateResult>;
};

export type ProsodyGenerateResult =
  | ["ok", any /* TODO: typing */]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_language_segmentation_format",
  ]
  | ["error", "custom", Error];
