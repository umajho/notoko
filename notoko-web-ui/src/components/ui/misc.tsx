import { type Component, createEffect, createSignal, Show } from "solid-js";

export const NumberInputThatCanBeFallbackToTextInput: Component<{
  step?: number;
  min?: number;
  value: number;
  set$value: (val: number) => void;
}> = ($props) => {
  const [$isFallbacking, set$isFallbacking] = createSignal(false);

  return (
    <div class="flex gap-2">
      <Show
        when={!$isFallbacking()}
        fallback={
          <input
            type="text"
            class="input input-md"
            value={$props.value}
            onInput={(ev) => $props.set$value(Number(ev.target.value))}
          />
        }
      >
        <input
          type="number"
          class="input input-md"
          step={$props.step}
          min={$props.min}
          value={$props.value}
          onInput={(ev) => $props.set$value(Number(ev.target.value))}
        />
      </Show>
      <label class="label">
        <input
          type="checkbox"
          class="checkbox"
          checked={$isFallbacking()}
          onChange={(ev) => set$isFallbacking(ev.currentTarget.checked)}
        />
        fallback to text input
      </label>
    </div>
  );
};

/**
 * When the JSON text is not valid, `set$validData` is called with `null`.
 */
export const JsonTextarea: Component<{
  placeholder: string;
  set$validData: (data: any | null) => void;
}> = ($props) => {
  const [$jsonText, set$jsonText] = createSignal("");
  createEffect(() => {
    try {
      $props.set$validData(JSON.parse($jsonText()));
    } catch {
      $props.set$validData(null);
    }
  });

  return (
    <textarea
      class="textarea w-full h-24"
      placeholder={$props.placeholder}
      value={$jsonText()}
      onInput={(ev) => set$jsonText(ev.target.value)}
    >
    </textarea>
  );
};
