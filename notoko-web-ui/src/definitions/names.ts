import * as z from "zod/v4";
import { urlEncodeToSafePathSegment } from "~/utils/path-segment-url-encoding";

/**
 * “File Stem Safe” means that the ID can be safely used as a file's stem part.
 *
 * “Simple” means that other than letters and numbers, only underscore and dot
 * are allowed.
 */
function makeSimpleFileStemSafeId<Brand extends PropertyKey>() {
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

/**
 * A fully qualified identifier for a plugin.
 */
export const PluginId = makeSimpleFileStemSafeId<"PluginId">();
export type PluginId = z.infer<typeof PluginId>;

/**
 * A name to represent a specific instance of a plugin. Note that different
 * plugins may have instance names with the same key. To uniquely identify a
 * plugin's instance, you need both the plugin ID and the instance key.
 */
export const PluginInstanceKey = //
  makeNullPunctuatedPartSafeId<"PluginInstanceKey">();
export type PluginInstanceKey = z.infer<typeof PluginInstanceKey>;

/**
 * A fully qualified name to represent a specific instance of a plugin.
 */
export const PluginInstanceFQN = z.string().brand<"PluginInstanceFQN">();
export type PluginInstanceFQN = z.infer<typeof PluginInstanceFQN>;

export function makePluginInstanceFQN(
  pluginId: PluginId,
  instanceKey: PluginInstanceKey,
): PluginInstanceFQN {
  return PluginInstanceFQN.parse(
    `${pluginId}[${urlEncodeToSafePathSegment(instanceKey)}]`,
  );
}

/**
 * A name to represent a functionality provided by a plugin instance. Note that
 * different plugin instances may have functionalities with the same key. To
 * uniquely identify a plugin instance's functionality, you need the plugin ID,
 * the instance key, and the functionality key.
 */
export const PluginInstanceFunctionalityKey = //
  makeNullPunctuatedPartSafeId<"PluginInstanceFunctionalityKey">();
export type PluginInstanceFunctionalityKey = z //
.infer<typeof PluginInstanceFunctionalityKey>;

/**
 * A fully qualified name to represent a functionality provided by a plugin
 * instance.
 */
export const FunctionalityFQN = z.string().brand<"FunctionalityFQN">();
export type FunctionalityFQN = z.infer<typeof FunctionalityFQN>;

export const SINGLETON_PLUGIN_INSTANCE_KEY = PluginInstanceKey
  .parse("__singleton__");
