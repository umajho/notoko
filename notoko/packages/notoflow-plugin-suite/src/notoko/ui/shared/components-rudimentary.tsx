import { Fragment, type FunctionComponent } from "preact";
import { Signal } from "@preact/signals";

export interface ButtonTabEntry {
  name: string;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

export const ButtonTabs: FunctionComponent<{
  $tabs: Signal<ButtonTabEntry[]>;
}> = (props) => {
  return (
    <div role="tablist" class="tabs tabs-border">
      {props.$tabs.value.map((tab) => (
        <Fragment key={tab.name}>
          <button
            role="tab"
            class={`tab${tab.isActive ? " tab-active" : ""}`}
            disabled={tab.isDisabled}
            onClick={(ev) => {
              ev.preventDefault();
              tab.onClick();
            }}
          >
            {tab.name}
          </button>
        </Fragment>
      ))}
    </div>
  );
};
