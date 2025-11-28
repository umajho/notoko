export type LanguageSpecifier = {
  "iso639-3": string;
  script: { "iso15924": string };
};
export type LanguageSpecifierWithSegmentationFormat = LanguageSpecifier & {
  segmentationFormat: string;
};
export type PhonemeSegment = { text: string; phonemes: string[] };
export type Duration2d = number[][];
