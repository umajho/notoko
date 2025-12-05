import * as z from "zod/v4";
import {
  urlDecodeFromSafePathSegment,
  UrlEncodedSafePathSegment,
  urlEncodeToSafePathSegment,
} from "@notoko/utils/path-segment-url-encoding";

export const PLUGIN_CONTAINER_CONFIGURATION_FILE_STEM =
  "__notoko_plugin_container__";
export const PLUGIN_CONFIGURATION_FILE_STEM = "__notoko_plugin__";

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
 *
 * example(s):
 * - `notoko.stock`
 * - `notoko.connectors.json_api`
 */
export const PluginId = makeSimpleFileStemSafeId<"PluginId">();
export type PluginId = z.infer<typeof PluginId>;

/**
 * A name to represent a specific instance of a plugin. Note that different
 * plugins may have instance names with the same key. To uniquely identify a
 * plugin's instance, you need both the plugin ID and the instance key.
 *
 * example(s):
 * - `__singleton__`
 * - `http://localhost:11111/`
 */
export const PluginInstanceKey = //
  makeNullPunctuatedPartSafeId<"PluginInstanceKey">();
export type PluginInstanceKey = z.infer<typeof PluginInstanceKey>;

/**
 * A fully qualified name to represent a specific instance of a plugin.
 *
 * example(s):
 * - `notoko.stock[__singleton__]`
 * - `notoko.connectors.json_api[http%3a%2f%2flocalhost%3a11111%2f]`
 */
export const PluginInstanceFqn = z.string().brand<"PluginInstanceFqn">();
export type PluginInstanceFqn = z.infer<typeof PluginInstanceFqn>;

export function makePluginInstanceFqn(
  pluginId: PluginId,
  instanceKey: PluginInstanceKey,
): PluginInstanceFqn {
  return PluginInstanceFqn.parse(
    `${pluginId}[${urlEncodeToSafePathSegment(instanceKey)}]`,
  );
}

export function tryExtractPartsFromPluginInstanceFqn(fqn: PluginInstanceFqn) {
  const RX = /^(.+)\[(.+)\]$/;
  const g = RX.exec(fqn);
  if (!g) return null;
  return {
    pluginId: PluginId.parse(g[1]),
    pluginInstanceKey: PluginInstanceKey.parse(
      urlDecodeFromSafePathSegment(UrlEncodedSafePathSegment.parse(g[2])),
    ),
  };
}

/**
 * A name to represent a functionality provided by a plugin instance. Note that
 * different plugin instances may have functionalities with the same key. To
 * uniquely identify a plugin instance's functionality, you need the plugin ID,
 * the instance key, and the functionality key.
 *
 * example(s):
 * - `cmn.phonemizer`
 */
export const PluginInstanceFunctionalityKey = //
  makeNullPunctuatedPartSafeId<"PluginInstanceFunctionalityKey">();
export type PluginInstanceFunctionalityKey = z //
.infer<typeof PluginInstanceFunctionalityKey>;

/**
 * A fully qualified name to represent a functionality provided by a plugin
 * instance.
 *
 * example(s):
 * - `notoko.stock[__singleton__][cmn%2ephonemizer]`
 */
export const FunctionalityFqn = z.string().brand<"FunctionalityFqn">();
export type FunctionalityFqn = z.infer<typeof FunctionalityFqn>;

export function makeFunctionalityFqn(
  pluginId: PluginId,
  instanceKey: PluginInstanceKey,
  functionalityKey: PluginInstanceFunctionalityKey,
): FunctionalityFqn {
  let fqn: string = pluginId;
  fqn += `[${urlEncodeToSafePathSegment(instanceKey)}]`;
  fqn += `[${urlEncodeToSafePathSegment(functionalityKey)}]`;
  return FunctionalityFqn.parse(fqn);
}

export function extractPluginInstanceFunctionalityKeyFromFqn(
  fqn: FunctionalityFqn,
): PluginInstanceFunctionalityKey {
  const RX = /^.+\[.+\]\[(.+)\]$/;
  const g = RX.exec(fqn);
  if (!g) throw new Error("unreachable!");
  return PluginInstanceFunctionalityKey.parse(
    urlDecodeFromSafePathSegment(UrlEncodedSafePathSegment.parse(g[1])),
  );
}

export const SINGLETON_PLUGIN_INSTANCE_KEY = PluginInstanceKey
  .parse("__singleton__");
