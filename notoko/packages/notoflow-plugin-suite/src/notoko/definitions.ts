import z, { object } from "zod/v4";

//================ common ================//

/**
 * ISO 639-3.
 */
export const Language = z.string().regex(/^[a-z]{3}$/).brand<"Language">();
export type Language = z.infer<typeof Language>;

/**
 * `<ISO 639-3>-<ISO 15924>`.
 */
export const LanguageWithScript = z.string()
  .regex(/^[a-z]{3}-[A-Z][a-z]{3}$/)
  .brand<"LanguageWithScript">();
export type LanguageWithScript = z.infer<typeof LanguageWithScript>;

export const PhonemeLexicon = z.string().brand<"PhonemeLexicon">();
export type PhonemeLexicon = z.infer<typeof PhonemeLexicon>;

export const PhonemeSegment = z.object({
  text: z.string(),
  phonemes: z.array(z.string()),
});
export type PhonemeSegment = z.infer<typeof PhonemeSegment>;

export const DurationTicks2d = z.array(z.array(z.number().int().nonnegative()));
export type DurationTicks2d = z.infer<typeof DurationTicks2d>;

export const PitchHz2d = z.array(z.array(z.number().nonnegative()));
export type PitchHz2d = z.infer<typeof PitchHz2d>;

/**
 * TODO: figure out the unit of energy.
 */
export const EnergyZScore2d = z.array(z.array(z.number()));
export type EnergyZScore2d = z.infer<typeof EnergyZScore2d>;

export const DurationPrediction = z.object({
  durationTicks2d: DurationTicks2d,
  ticksPerSecond: z.number().int().positive(),
});
export type DurationPrediction = z.infer<typeof DurationPrediction>;

export const PitchPrediction = z.object({ pitchHz2d: PitchHz2d });
export type PitchPrediction = z.infer<typeof PitchPrediction>;

export const EnergyPrediction = z.object({ energyZScore2d: EnergyZScore2d });
export type EnergyPrediction = z.infer<typeof EnergyPrediction>;

export const FeaturePredictionOverrideSupport = z
  .enum(["required", "optional", "forbidden"]);
export type FeaturePredictionOverrideSupport = z.//
infer<typeof FeaturePredictionOverrideSupport>;

export const FeatureOptions = z.object({
  duration: DurationPrediction,
  pitch: PitchPrediction,
  energy: EnergyPrediction,
});
export type FeatureOptions = z.infer<typeof FeatureOptions>;

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

//================ Prosody Features Predictor ================//

export const ProsodyFeaturesPredictorSpecification = z.object({
  supportedLanguageAndPhonemeLexiconCombinations: z.array(z
    .object({ language: Language, phonemeLexicon: PhonemeLexicon })),
});
export type ProsodyFeaturesPredictorSpecification = z.//
infer<typeof ProsodyFeaturesPredictorSpecification>;

export const ProsodyFeaturesPredictorPredictSpecifier = z
  .object({ language: Language, phonemeLexicon: PhonemeLexicon });
export type ProsodyFeaturesPredictorPredictSpecifier = z.//
infer<typeof ProsodyFeaturesPredictorPredictSpecifier>;
export const ProsodyFeaturesPredictorPredictInput = z.object({
  phonemeSegments: z.array(PhonemeSegment),
  featurePredictionOverrides: FeatureOptions.partial().optional(),
  controls: z.object({
    speed: z.number().positive().optional(),
    pitch: z.number().positive().optional(),
    energy: z.number().positive().optional(),
  }).optional(),
}).refine((x) => {
  if (x.featurePredictionOverrides?.duration && x.controls?.speed) return false;
  if (x.featurePredictionOverrides?.pitch && x.controls?.pitch) return false;
  if (x.featurePredictionOverrides?.energy && x.controls?.energy) return false;
  return true;
});
export type ProsodyFeaturesPredictorPredictInput = z.//
infer<typeof ProsodyFeaturesPredictorPredictInput>;
export const ProsodyFeaturesPredictorPredictOutput = z.object({
  duration: z.union([
    DurationPrediction,
    z.object({ isOverridden: z.literal(true) }),
  ]),
  pitch: z.union([
    PitchPrediction,
    z.object({ isOverridden: z.literal(true) }),
  ]),
  energy: z.union([
    EnergyPrediction,
    z.object({ isOverridden: z.literal(true) }),
  ]),
});
export type ProsodyFeaturesPredictorPredictOutput = z.infer<
  typeof ProsodyFeaturesPredictorPredictOutput
>;

//================ Prosody Generator ================//

export const ProsodyGeneratorSpecification = z.object({
  supportedLanguageAndPhonemeLexiconCombinations: z.array(z
    .object({ language: Language, phonemeLexicon: PhonemeLexicon })),
});
export type ProsodyGeneratorSpecification = z.//
infer<typeof ProsodyGeneratorSpecification>;

export const ProsodyGeneratorGenerateProsodySpecifier = z
  .object({ language: Language, phonemeLexicon: PhonemeLexicon });
export type ProsodyGeneratorGenerateProsodySpecifier = z.//
infer<typeof ProsodyGeneratorGenerateProsodySpecifier>;
export const ProsodyGeneratorGenerateProsodyInput = z.object({
  phonemeSegments: z.array(PhonemeSegment),
  featurePredictions: FeatureOptions,
});
export type ProsodyGeneratorGenerateProsodyInput = z.//
infer<typeof ProsodyGeneratorGenerateProsodyInput>;
export const ProsodyGeneratorGenerateProsodyOutput = ProsodyData;
export type ProsodyGeneratorGenerateProsodyOutput = ProsodyData;
