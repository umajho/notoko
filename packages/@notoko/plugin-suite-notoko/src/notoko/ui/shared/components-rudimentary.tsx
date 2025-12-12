import { type Component, For } from "solid-js";

export interface ButtonTabEntry {
  name: string;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

/**
 * TODO: this is copied from web UI. Maybe I should refactor this later to
 * deduplicate.
 */
export const ButtonTabs: Component<{
  tabs: () => ButtonTabEntry[];
}> = ($props) => {
  return (
    <div role="tablist" class="tabs tabs-border">
      <For each={$props.tabs()}>
        {(tab) => (
          <button
            role="tab"
            class={`tab${tab.isActive ? " tab-active" : ""}`}
            disabled={tab.isDisabled}
            onClick={tab.onClick}
          >
            {tab.name}
          </button>
        )}
      </For>
    </div>
  );
};
