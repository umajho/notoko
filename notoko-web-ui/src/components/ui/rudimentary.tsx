import { type Component, For, type JSX } from "solid-js";
import { A, useLocation } from "@solidjs/router";

import { cls } from "~/utils/cls";

export const MenuItemLink: Component<{ path: string; children: JSX.Element }> =
  ($props) => {
    const location = useLocation();

    const isInside = () =>
      `${location.pathname}/`.startsWith(`${$props.path}/`);

    return (
      <li>
        <A href={$props.path} class={cls(isInside() && "menu-active")}>
          {$props.children}
        </A>
      </li>
    );
  };

export interface TabEntry {
  name: string;
  isActive: boolean;
  href: string;
}

export const Tabs: Component<{
  tabs: () => TabEntry[];
}> = ($props) => {
  return (
    <div role="tablist" class="tabs tabs-border">
      <For each={$props.tabs()}>
        {(tab) => (
          <A
            role="tab"
            class={cls("tab", tab.isActive && "tab-active")}
            href={tab.href}
          >
            {tab.name}
          </A>
        )}
      </For>
    </div>
  );
};

export const LoadingSpan: Component<{
  class?: string;
  flavor?: "spinner" | "dots";
  size?: "xl";
}> = ($props) => {
  const flavorClass = () =>
    $props.flavor
      ? (`loading-${$props.flavor}` satisfies
        | "loading-spinner"
        | "loading-dots")
      : null;
  const sizeClass = () =>
    $props.size ? (`loading-${$props.size}` satisfies "loading-xl") : null;

  return (
    <span class={cls($props.class, "loading", flavorClass(), sizeClass())} />
  );
};
