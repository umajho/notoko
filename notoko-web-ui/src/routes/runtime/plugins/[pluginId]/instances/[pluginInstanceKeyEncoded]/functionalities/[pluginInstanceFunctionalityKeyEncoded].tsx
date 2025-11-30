import { type Component, createSignal } from "solid-js";
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

  const [$title, set$title] = createSignal("Functionality: …");

  return (
    <>
      <Title>{makeTitle($title())}</Title>

      <main class="prose container mx-auto h-full overflow-y-auto">
        <FunctionalityDemonstrator
          pluginId={$selectedPluginId()!}
          pluginInstanceKey={$selectedPluginInstanceKey()!}
          pluginInstanceFunctionalityKey={$selectedPluginInstanceFunctionalityKey()!}
          set$title={set$title}
        />
      </main>
    </>
  );
}) satisfies Component<{}>;
