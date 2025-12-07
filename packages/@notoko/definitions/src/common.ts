import * as z from "zod/v4";

export type LanguageSpecifier = {
  "iso639-3": string;
};

/**
 * `<ISO 639-3>-<ISO 15924>`.
 */
export const LanguageWithScript = z.string()
  .regex(/^[a-z]{3}-[A-Z][a-z]{3}$/)
  .brand("LanguageWithScript");
export type LanguageWithScript = z.infer<typeof LanguageWithScript>;

export type LanguageSpecifierWithSegmentationFormat = LanguageSpecifier & {
  segmentationFormat: string;
};

export type PhonemeSegment = { text: string; phonemes: string[] };
export const Duration2d = z.array(z.array(z.number().int().nonnegative()));
export type Duration2d = z.infer<typeof Duration2d>;
