import * as _ from "es-toolkit";

import {
  type Component,
  createEffect,
  createSignal,
  onMount,
  Show,
} from "solid-js";
import { usePrefersDark } from "@solid-primitives/media";

import { JsonFormsElement } from "@notoko/jsonforms-react-custom-element";

customElements.define("json-forms", JsonFormsElement);

/**
 * @deprecated It has been replaced by `Rjsf`, since there is no way to
 * control its debouncing behavior, leading to submitting stale data in some
 * cases.
 */
export const JsonForms: Component<{
  data: any;
  onChange?: (data: any, errors: any[]) => void;
  schema?: any;
  uischema?: any;
  config?: any;
  uischemas?: any;
  readonly?: boolean;
  validationMode?: any;
  i18n?: any;
  additionalErrors?: any;
}> = ($props) => {
  let el!: any;

  const $prefersDark = usePrefersDark();

  onMount(() => {
    el.addEventListener("jsonforms:change", (ev: any) => {
      $props.onChange?.(ev.data.data, ev.data.errors);
    });
  });

  return (
    <json-forms
      ref={el}
      dark={$prefersDark()}
      data={$props.data}
      // prop:onChange={$props.onChange}
      schema={$props.schema}
      uischema={$props.uischema}
      config={$props.config}
      uischemas={$props.uischemas}
      readonly={$props.readonly}
      validationMode={$props.validationMode}
      prop:i18n={$props.i18n} // not sure.
      additionalErrors={$props.additionalErrors}
    />
  );
};

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "json-forms": {
        ref?: HTMLElement;
        dark?: boolean;
        data: any;
        "prop:onChange"?: (data: any) => void;
        schema?: any;
        uischema?: any;
        config?: any;
        uischemas?: any;
        readonly?: boolean;
        validationMode?: any;
        "prop:i18n"?: any;
        additionalErrors?: any;
      };
    }
  }
}

export const JsonFormsLiteEx: Component<{
  data: any;
  shouldDisableSubmit?: boolean;
  onSubmit: (data: any) => void;
  setHasUnsavedChanges?: (v: boolean) => void;
  schema?: any;
  uischema?: any;
}> = ($props) => {
  const [$unsavedData, set$unsavedData] = createSignal<any>(undefined);
  createEffect(() =>
    $props.setHasUnsavedChanges?.($unsavedData() !== undefined)
  );
  const [$unsavedDataErrors, set$unsavedErrors] = createSignal<any[]>([]);
  function handleChangeData(data: any, errors: any[]) {
    if (_.isEqual(data, $props.data)) {
      data = undefined;
    }

    set$unsavedData(data);
    set$unsavedErrors(errors);
  }
  const $canSubmit = () =>
    !$props.shouldDisableSubmit &&
    $unsavedData() !== undefined &&
    $unsavedDataErrors().length === 0;

  function handleSubmitData(ev: Event) {
    ev.preventDefault();
    if (!$canSubmit()) return;

    const activeElement = document.activeElement!;

    const dummyEl = document.createElement("input");
    dummyEl.style.position = "absolute";
    dummyEl.style.opacity = "0";
    document.body.appendChild(dummyEl);
    dummyEl.focus();
    document.body.removeChild(dummyEl);

    const staleInput = $unsavedData();
    const start = performance.now();
    function tick() {
      if (
        performance.now() - start < 300 && _.isEqual(staleInput, $unsavedData())
      ) {
        requestAnimationFrame(tick);
      } else {
        $props.onSubmit($unsavedData());

        set$unsavedData(undefined);
      }
    }
    tick();
  }

  return (
    <form
      class="flex flex-col gap-2"
      onSubmit={handleSubmitData}
    >
      <JsonForms
        data={$props.data}
        onChange={handleChangeData}
        schema={$props.schema}
        uischema={$props.uischema}
      />
      <Show when={$canSubmit()}>
        <input type="submit" class="btn btn-primary">Submit</input>
      </Show>
    </form>
  );
};
