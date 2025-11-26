import { createMemo } from "solid-js";
import { type RouteSectionProps, useLocation } from "@solidjs/router";

import { type TabEntry, Tabs } from "~/components/ui/rudimentary";

export default function Layout($props: RouteSectionProps) {
  const location = useLocation();

  const TAB_NAMES = [
    "Plugins",
    "Phonemizers",
    "Duration-Predictors",
    "Prosody-Generators",
  ] as const;
  const TAB_INFOS: { [key in typeof TAB_NAMES[number]]: { href: string } } = {
    "Plugins": { href: "/runtime/plugins" },
    "Phonemizers": { href: "/runtime/phonemizers" },
    "Duration-Predictors": { href: "/runtime/duration-predictors" },
    "Prosody-Generators": { href: "/runtime/prosody-generators" },
  };

  const $tabEntries = createMemo<TabEntry[]>(() => {
    return TAB_NAMES.map((name) => {
      const href = TAB_INFOS[name].href;
      const isInside = () => `${location.pathname}/`.startsWith(`${href}/`);

      return { name, isActive: isInside(), href };
    });
  });

  return (
    <>
      <nav>
        <Tabs tabs={$tabEntries} />
      </nav>
      {$props.children}
    </>
  );
}
