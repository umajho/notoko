import z from "zod/v4";

import {
  Duration2d,
  Language,
  LanguageWithScript,
  PhonemeLexicon,
  PhonemeSegment,
} from "@notoko/definitions";

//================ common ================//

export const DurationPrediction = z.object({
  durationTicks2d: Duration2d,
  ticksPerSecond: z.number().int().positive(),
});
export type DurationPrediction = z.infer<typeof DurationPrediction>;

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

//================ Phonemizer ================//

export const PhonemizerSpecification = z.object({
  supportedLanguages: z.array(LanguageWithScript),
  supportedOutputPhonemeLexica: z.array(PhonemeLexicon),
});
export type PhonemizerSpecification = z.infer<typeof PhonemizerSpecification>;

export const PhonemizerPhonemizeSpecifier = z.object({
  language: LanguageWithScript,
  outputPhonemeLexicon: PhonemeLexicon,
});
export type PhonemizerPhonemizeSpecifier = z.//
infer<typeof PhonemizerPhonemizeSpecifier>;
export const PhonemizerPhonemizeInput = z.object({ text: z.string() });
export type PhonemizerPhonemizeInput = z.infer<typeof PhonemizerPhonemizeInput>;
export const PhonemizerPhonemizeOutput = z
  .object({ phonemeSegments: z.array(PhonemeSegment) });
export type PhonemizerPhonemizeOutput = z.//
infer<typeof PhonemizerPhonemizeOutput>;

/**
 * FIXME: `language: Language,` should also be here.
 */
export const PhonemizerValidatePhonemeSpecifier = z.object({
  phonemeLexicon: PhonemeLexicon,
});
export type PhonemizerValidatePhonemeSpecifier = z.//
infer<typeof PhonemizerValidatePhonemeSpecifier>;
export const PhonemizerValidatePhonemeInput = z.object({ phoneme: z.string() });
export type PhonemizerValidatePhonemeInput = z.//
infer<typeof PhonemizerValidatePhonemeInput>;
export const PhonemizerValidatePhonemeOutput = z
  .object({ isValid: z.boolean() });
export type PhonemizerValidatePhonemeOutput = z.//
infer<typeof PhonemizerValidatePhonemeOutput>;

//================ Duration Predictor ================//

export const DurationPredictorSpecification = z.object({
  supportedLanguageAndPhonemeLexiconCombinations: z.array(z
    .object({ language: Language, phonemeLexicon: PhonemeLexicon })),
});
export type DurationPredictorSpecification = z.//
infer<typeof DurationPredictorSpecification>;

export const DurationPredictorPredictDurationSpecifier = z
  .object({ language: Language, phonemeLexicon: PhonemeLexicon });
export type DurationPredictorPredictDurationSpecifier = z.//
infer<typeof DurationPredictorPredictDurationSpecifier>;
export const DurationPredictorPredictDurationInput = z.object({
  phonemeSegments: z.array(PhonemeSegment),
  speed: z.number().optional(),
});
export type DurationPredictorPredictDurationInput = z.//
infer<typeof DurationPredictorPredictDurationInput>;
export const DurationPredictorPredictDurationOutput = DurationPrediction;
export type DurationPredictorPredictDurationOutput = DurationPrediction;

//================ Prosody Generator ================//

export const DurationInputSupport = z
  .enum(["required", "optional", "forbidden"]);
export type DurationInputSupport = z.infer<typeof DurationInputSupport>;

export const ProsodyGeneratorSpecification = z.object({
  supportedLanguageAndPhonemeLexiconCombinations: z.array(z
    .object({ language: Language, phonemeLexicon: PhonemeLexicon })),
  durationInputSupport: DurationInputSupport,
});
export type ProsodyGeneratorSpecification = z.//
infer<typeof ProsodyGeneratorSpecification>;

export const ProsodyGeneratorGenerateProsodyInputDuration = z.union([
  z.tuple([z.literal("simple"), z.object({ speed: z.number().optional() })]),
  z.tuple([z.literal("custom"), DurationPrediction]),
]);
export type ProsodyGeneratorGenerateProsodyInputDuration = z.//
infer<typeof ProsodyGeneratorGenerateProsodyInputDuration>;

export const ProsodyGeneratorGenerateProsodySpecifier = z
  .object({ language: Language, phonemeLexicon: PhonemeLexicon });
export type ProsodyGeneratorGenerateProsodySpecifier = z.//
infer<typeof ProsodyGeneratorGenerateProsodySpecifier>;
export const ProsodyGeneratorGenerateProsodyInput = z.object({
  phonemeSegments: z.array(PhonemeSegment),
  duration: ProsodyGeneratorGenerateProsodyInputDuration,
});
export type ProsodyGeneratorGenerateProsodyInput = z.//
infer<typeof ProsodyGeneratorGenerateProsodyInput>;
export const ProsodyGeneratorGenerateProsodyOutput = ProsodyData;
export type ProsodyGeneratorGenerateProsodyOutput = ProsodyData;
