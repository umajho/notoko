import { type Component, For, type JSX } from "solid-js";
import { useLocation } from "@solidjs/router";

import { cls } from "~/utils/cls";

export const MenuItemLink: Component<{ path: string; children: JSX.Element }> =
  (props) => {
    const location = useLocation();

    const isInside = () => `${location.pathname}/`.startsWith(`${props.path}/`);

    return (
      <li>
        <a href={props.path} class={cls(isInside() && "menu-active")}>
          {props.children}
        </a>
      </li>
    );
  };

export interface TabEntry {
  name: string;
  isActive: boolean;
  href?: string;
  onClick?: (ev: Event & { currentTarget: HTMLElement }) => void;
}

export const Tabs: Component<{
  tabs: () => TabEntry[];
}> = ($props) => {
  return (
    <div role="tablist" class="tabs tabs-border">
      <For each={$props.tabs()}>
        {(tab) => (
          <a
            role="tab"
            class={cls("tab", tab.isActive && "tab-active")}
            href={tab.href}
            onClick={tab.onClick}
          >
            {tab.name}
          </a>
        )}
      </For>
    </div>
  );
};
