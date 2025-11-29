import * as _ from "es-toolkit";

import { type Component, onMount } from "solid-js";
import { usePrefersDark } from "@solid-primitives/media";

import { RjsfElement } from "@notoko/rjsf-custom-element";

customElements.define("rjs-form", RjsfElement);

export const Rjsf: Component<{
  schema?: any;
  data: any;
  onSubmit: (data: any) => void;
  setIsUnsaved?: (v: boolean) => void;
  setIsOutOfSync?: (v: boolean) => void;
}> = ($props) => {
  let el!: any;

  const $prefersDark = usePrefersDark();

  onMount(() => {
    el.addEventListener("rjsf:submit", (ev: any) => {
      $props.onSubmit?.(ev.data.data);
    });
    el.addEventListener("rjsf:setIsUnsaved", (ev: any) => {
      $props.setIsUnsaved?.(ev.data);
    });
    el.addEventListener("rjsf:outOfSync", (ev: any) => {
      $props.setIsOutOfSync?.(true);
    });
  });

  return (
    <rjs-form
      ref={el}
      dark={$prefersDark()}
      schema={$props.schema}
      data={$props.data}
    />
  );
};

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "rjs-form": {
        ref?: HTMLElement;
        dark?: boolean;
        schema?: any;
        data: any;
      };
    }
  }
}
