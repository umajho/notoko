import { createMemo } from "solid-js";
import { type RouteSectionProps, useLocation } from "@solidjs/router";

import { type LinkTabEntry, LinkTabs } from "~/components/ui/rudimentary";

export default function Layout($props: RouteSectionProps) {
  const location = useLocation();

  const TAB_NAMES = [
    "Plugins",
  ] as const;
  const TAB_INFOS: { [key in typeof TAB_NAMES[number]]: { href: string } } = {
    "Plugins": { href: "/runtime/plugins" },
  };

  const $tabEntries = createMemo<LinkTabEntry[]>(() => {
    return TAB_NAMES.map((name) => {
      const href = TAB_INFOS[name].href;
      const isInside = () => `${location.pathname}/`.startsWith(`${href}/`);

      return { name, isActive: isInside(), href };
    });
  });

  return (
    <>
      <nav>
        <LinkTabs tabs={$tabEntries} />
      </nav>
      {$props.children}
    </>
  );
}
