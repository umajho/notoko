import { type Component, createEffect, onMount } from "solid-js";

import "@alenaksu/json-viewer";
import { JsonViewer as JsonViewerElement } from "@alenaksu/json-viewer/JsonViewer.js";

export const JsonViewer: Component<{
  data: any;
  expand?: RegExp | string;
}> = ($props) => {
  let el!: JsonViewerElement;

  onMount(() => {
    createEffect(() => $props.expand && el.expand($props.expand));
  });

  return <json-viewer ref={el} data={$props.data} />;
};

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "json-viewer": {
        ref?: JsonViewerElement;
        data: any;
      };
    }
  }
}
