import { type Params, useParams } from "@solidjs/router";

import {
  FunctionalityDictionaryEntryKey,
  FunctionalityMethodName,
  PluginId,
  PluginInstanceFunctionalityKey,
  PluginInstanceKey,
} from "@notoflow/definitions";
import {
  urlDecodeFromSafePathSegment,
  UrlEncodedSafePathSegment,
} from "@notoflow/utils/path-segment-url-encoding";
import { createMemo } from "solid-js";

/**
 * XXX: don't destructure the returned value if reactivity is desired.
 */
export function useRuntimePagePluginsTabParams() {
  const params = useParams();
  const $selectedPluginId = createMemo(() =>
    params.pluginId ? PluginId.parse(params.pluginId) : null
  );
  const $selectedPluginInstanceKey = createMemo(() =>
    params.pluginInstanceKeyEncoded
      ? PluginInstanceKey.parse(
        urlDecodeFromSafePathSegment(
          UrlEncodedSafePathSegment.parse(params.pluginInstanceKeyEncoded),
        ),
      )
      : null
  );
  const $selectedPluginInstanceFunctionalityKey = createMemo(() =>
    params.pluginInstanceFunctionalityKeyEncoded
      ? PluginInstanceFunctionalityKey.parse(
        urlDecodeFromSafePathSegment(
          UrlEncodedSafePathSegment
            .parse(params.pluginInstanceFunctionalityKeyEncoded),
        ),
      )
      : null
  );

  return {
    $selectedPluginId,
    $selectedPluginInstanceKey,
    $selectedPluginInstanceFunctionalityKey,
  };
}

/**
 * XXX: don't destructure the returned value if reactivity is desired.
 */
export function useApiPluginsParams(rawParams?: Params) {
  const params = rawParams ?? useParams();
  const $pluginId = createMemo(() =>
    params.pluginId ? PluginId.parse(params.pluginId) : null
  );
  const $functionalityDictionaryEntryKey = createMemo(() =>
    params.functionalityDictionaryEntryKey
      ? FunctionalityDictionaryEntryKey
        .parse(params.functionalityDictionaryEntryKey)
      : null
  );
  const $functionalityMethodName = createMemo(() =>
    params.functionalityMethodName
      ? FunctionalityMethodName.parse(params.functionalityMethodName)
      : null
  );

  return {
    $pluginId,
    $functionalityDictionaryEntryKey,
    $functionalityMethodName,
  };
}
