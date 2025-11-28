import type { Component } from "solid-js";
import { Title } from "@solidjs/meta";

import { makeTitle } from "~/utils/titles";
import { useRuntimePagePluginsTabParams } from "~/routes/runtime/plugins";
import { FunctionalityDemonstrator } from "~/components/tab-runtime/FunctionalityDemonstrator";

export default (() => {
  const {
    $selectedPluginId,
    $selectedPluginInstanceKey,
    $selectedPluginInstanceFunctionalityKey,
  } = useRuntimePagePluginsTabParams();

  return (
    <>
      <Title>{makeTitle("Functionality: …")}</Title>

      <main class="prose container mx-auto h-full overflow-y-auto">
        <FunctionalityDemonstrator
          pluginId={$selectedPluginId()!}
          pluginInstanceKey={$selectedPluginInstanceKey()!}
          pluginInstanceFunctionalityKey={$selectedPluginInstanceFunctionalityKey()!}
        />
      </main>
    </>
  );
}) satisfies Component<{}>;
