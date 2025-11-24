import * as z from "zod/v4";

export const DATA_PATH = "./data";
export const DATA_WORKFLOWS_PATH = `${DATA_PATH}/workflows`;
export const DATA_PLUGIN_DATA_PATH = `${DATA_PATH}/plugin_data`;

export const FOLDER_PATHS_SHOULD_BE_CREATED = [
  DATA_PATH,
  DATA_WORKFLOWS_PATH,
  DATA_PLUGIN_DATA_PATH,
];

/**
 * “File Stem Safe” means that the ID can be safely used as a file's stem part.
 */
function makeFileStemSafeId<Brand extends PropertyKey>() {
  return z.string()
    .min(1)
    .max(255)
    .regex(/^[\p{L}\p{M}\p{N}_.]+$/u)
    .brand<Brand>();
}
/**
 * “Null Punctuated Part Safe” means that the ID cannot contain null characters,
 * so that it can be safely used in a string that uses null characters as part-
 * separators.
 */
function makeNullPunctuatedPartSafeId<Brand extends PropertyKey>() {
  return z.string()
    .min(1)
    .max(255)
    .regex(/^[^\0]+$/)
    .brand<Brand>();
}

export const RootPluginNodeId = makeFileStemSafeId<"RootPluginNodeId">();
export type RootPluginNodeId = z.infer<typeof RootPluginNodeId>;
export const PluginNodeKey = makeNullPunctuatedPartSafeId<"PluginNodeKey">();
export type PluginNodeKey = z.infer<typeof PluginNodeKey>;
export const PluginFunctionalityKey = //
  makeNullPunctuatedPartSafeId<"PluginFunctionalityKey">();
export type PluginFunctionalityKey = z.infer<typeof PluginFunctionalityKey>;
export const PluginFunctionalityAbsolutePath = z.string()
  .brand<"PluginFunctionalityAbsolutePath">();
export type PluginFunctionalityAbsolutePath = //
  z.infer<typeof PluginFunctionalityAbsolutePath>;

export type PluginNodeStatus = "loading" | "ready" | "error";

type PluginNodeBase = {
  info: {
    shownName: string;
    version: string;
    staticConfigurationSchema: ["json_schema", object];
  };
  initialStatus: PluginNodeStatus;
  entry: (ctx: PluginNodeContext) => void;
  /**
   * The configuration predefined by the plugin node statically, which means it
   * cannot be changed after the plugin node is registered.
   */
  upgradeStaticConfiguration?: (
    oldConfig: object,
    opts: { fromVersion: string },
  ) => object;
};
export type PluginNodeSingleton = PluginNodeBase & {
  type: "plugin_node:singleton";
  defaultStaticConfiguration: object;
};
export type PluginNodeMultiton = PluginNodeBase & {
  type: "plugin_node:multiton";
  staticConfigurationTemplates: { content: object; isStock: boolean }[];
  extractKeyFromStaticConfiguration: (config: object) => PluginNodeKey;
};
export type PluginNode = PluginNodeSingleton | PluginNodeMultiton;

export type PhonemizeResult =
  | ["ok", PhonemeSegment[]]
  | ["error", "unsupported_input_language"]
  | ["error", "unsupported_output_segmentation_format"]
  | ["error", "custom", Error];
export type IsValidatePhonemeResult =
  | ["ok", boolean]
  | ["error", "unsupported_segmentation_format"];
export type DurationPredictResult =
  | ["ok", Duration2d]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_language_segmentation_format",
  ]
  | ["error", "custom", Error];
export type ProsodyGenerateResult =
  | ["ok", any /* TODO: typing */]
  | [
    "error",
    | "unsupported_input_language"
    | "unsupported_input_language_segmentation_format",
  ]
  | ["error", "custom", Error];

export type PluginFunctionalityPhonemizer = {
  type: "plugin_functionality:phonemizer";
  supportedInputLanguages: readonly LanguageSpecifier[];
  supportedOutputSegmentationFormats: readonly string[];
  phonemize: (
    lang: LanguageSpecifier,
    text: string,
    opts: { outputSegmentationFormat: string },
  ) => Promise<PhonemizeResult>;
  isValidPhoneme(
    segmentationFormat: string,
    phoneme: string,
  ): IsValidatePhonemeResult;
};

export type PluginFunctionalityDurationPredictor = {
  type: "plugin_functionality:duration_predictor";
  supportedInputLanguages: readonly LanguageSpecifierWithSegmentationFormat[];
  predictDuration: (
    lang: LanguageSpecifierWithSegmentationFormat,
    phonemeSegments: PhonemeSegment[],
  ) => Promise<DurationPredictResult>;
};

export type PluginFunctionalityProsodyGenerator = {
  type: "plugin_functionality:prosody_generator";
  supportedInputLanguages: readonly LanguageSpecifierWithSegmentationFormat[];
  generateProsody: (
    lang: LanguageSpecifierWithSegmentationFormat,
    input: { phonemeSegments: PhonemeSegment[]; duration2d?: Duration2d },
  ) => Promise<ProsodyGenerateResult>;
};

export type PluginFunctionality =
  | PluginFunctionalityPhonemizer
  | PluginFunctionalityDurationPredictor
  | PluginFunctionalityProsodyGenerator;

export interface PluginNodeContext {
  set onChangeStaticConfiguration(handler: (config: object) => void);
  set onRequestRefresh(handler: () => void);
  set onDispose(
    handler: (untilChildrenAreDisposed: Promise<void>) => Promise<void>,
  );
  setStatus: (status: PluginNodeStatus) => void;
  registerSingletonChildNode: (
    childPluginKey: PluginNodeKey,
    node: PluginNodeSingleton,
  ) => {
    messagePort: MessagePort;
    unregister: () => void;
  };
  setFunctionalities: (
    functionalities: Record<PluginFunctionalityKey, PluginFunctionality>,
  ) => void;
}

export type LanguageSpecifier = { "iso639-3": string };
export type LanguageSpecifierWithSegmentationFormat = LanguageSpecifier & {
  segmentationFormat: string;
};
export type PhonemeSegment = { text: string; phonemes: string[] };
export type Duration2d = number[][];
