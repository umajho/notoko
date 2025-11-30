import * as z from "zod/v4";

export type LanguageSpecifier = {
  "iso639-3": string;
};
export type LanguageSpecifierWithScript = LanguageSpecifier & {
  script: { "iso15924": string };
};
export type LanguageSpecifierWithSegmentationFormat = LanguageSpecifier & {
  segmentationFormat: string;
};
export type PhonemeSegment = { text: string; phonemes: string[] };
export const Duration2d = z.array(z.array(z.number().int().nonnegative()));
export type Duration2d = z.infer<typeof Duration2d>;
