import { type Component, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import type { JSONSchema7, UiSchema } from "@jsfe/shoelace";

export const Jsfe: Component<{
  schema: JSONSchema7;
  uiSchema?: UiSchema;
  data: object;
  dataChangedCallback: (data: any) => void;
  submitCallback?: (data: any) => void;
}> = (props) => {
  const isReady = createAsync(async () => {
    await import("@jsfe/shoelace");
    return true;
  }, { initialValue: false });

  return (
    <Show
      when={isReady()}
      fallback={<span class="loading loading-spinner loading-xl mx-auto" />}
    >
      <jsf-shoelace
        prop:schema={props.schema}
        prop:uischema={props.uiSchema}
        prop:data={props.data}
        prop:dataChangedCallback={props.dataChangedCallback}
        prop:submitCallback={props.submitCallback}
      >
      </jsf-shoelace>
    </Show>
  );
};

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "jsf-shoelace": {
        "prop:schema": JSONSchema7;
        "prop:uischema"?: object;
        "prop:data": object;
        "prop:dataChangedCallback": (data: any) => void;
        "prop:submitCallback"?: (data: any) => void;
      };
    }
  }
}
