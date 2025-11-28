import { match, P } from "ts-pattern";

import { type Component, createSignal, Match, Show, Switch } from "solid-js";
import { createAsync, useAction } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { usePrefersDark } from "@solid-primitives/media";

import {
  type Functionality,
  FunctionalityFqn,
  type FunctionalityPhonemizer,
  type IsValidPhonemeResult,
  makeFunctionalityFqn,
  type PhonemizeResult,
  type PluginId,
  type PluginInstanceFunctionalityKey,
  type PluginInstanceKey,
} from "~/definitions.mod";
import {
  type FunctionalityActionResult,
  getFunctionalityInfo,
  phonemizerIsValidPhonemeAction,
  type PhonemizerIsValidPhonemeActionInput,
  phonemizerPhonemizeAction,
  type PhonemizerPhonemizeActionInput,
} from "~/client-server-bridge/plugin-manager";
import { LoadingSpan } from "../ui/rudimentary";
import { stringToNull, tryExtract } from "~/utils/misc";
import { cls } from "~/utils/cls";
import { Jsfe } from "../web-components/Jsfe";
import { JsonViewer } from "../web-components/JsonViewer";

export const FunctionalityDemonstrator: Component<{
  pluginId: PluginId;
  pluginInstanceKey: PluginInstanceKey;
  pluginInstanceFunctionalityKey: PluginInstanceFunctionalityKey;
}> = (props) => {
  const $fqn = () =>
    makeFunctionalityFqn(
      props.pluginId,
      props.pluginInstanceKey,
      props.pluginInstanceFunctionalityKey,
    );

  const $info = createAsync<Functionality["info"] | "not_found" | "loading">(
    () => getFunctionalityInfo($fqn()),
    { initialValue: "loading" },
  );

  const p = "functionality:";
  function tryExtractPhonemizer(
    info: Functionality["info"],
  ): FunctionalityPhonemizer["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}phonemizer`);
  }
  function tryExtractDurationPredictor(
    info: Functionality["info"],
  ): Functionality["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}duration_predictor`);
  }
  function tryExtractProsodyGenerator(
    info: Functionality["info"],
  ): Functionality["info"] | null {
    // @ts-ignore
    return tryExtract("associatedType", info, `${p}prosody_generator`);
  }

  return (
    <Switch>
      <Match when={$info() === "loading"}>
        <LoadingSpan size="xl" />
      </Match>
      <Match when={$info() === "not_found"}>
        TODO: NOT FOUND
      </Match>
      <Match when={stringToNull($info())}>
        {($info) => (
          <Switch>
            <Match when={tryExtractPhonemizer($info())}>
              <PhonemizerDemonstrator
                fqn={$fqn()}
                info={tryExtractPhonemizer($info())!}
              />
            </Match>
            <Match when={tryExtractDurationPredictor($info())}>
              TODO
            </Match>
            <Match when={tryExtractProsodyGenerator($info())}>
              TODO
            </Match>
          </Switch>
        )}
      </Match>
    </Switch>
  );
};

const PhonemizerDemonstrator: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
}> = (props) => {
  return (
    <>
      <Title>Phonemizer: {props.info.shownName}</Title>
      <h1>Phonemizer: {props.info.shownName}</h1>
      <span>
        FQN: <code>{props.fqn}</code>
      </span>
      <PhonemizerDemonstratorPhonemize {...props} />
      <PhonemizerDemonstratorIsValidPhoneme {...props} />
    </>
  );
};

const PhonemizerDemonstratorPhonemize: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
}> = (props) => {
  const $prefersDark = usePrefersDark();

  const [$input, set$input] = createSignal<any>({});
  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<PhonemizeResult> | null | "processing"
  >(null);

  const phonmeizerPhonemize = useAction(phonemizerPhonemizeAction);

  async function handleSubmit() {
    if ($actionResult() === "processing") return;
    set$actionResult("processing");
    set$actionResult(
      await phonmeizerPhonemize(
        props.fqn,
        $input() as PhonemizerPhonemizeActionInput,
      ),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>phonemize</code>
        </h2>
        <h3>Input:</h3>
        <Jsfe
          schema={{
            type: "object",
            required: ["inputLanguage", "outputSegmentationFormat"],
            properties: {
              language: {
                type: "object",
                required: ["iso639-3"],
                properties: {
                  "iso639-3": {
                    type: "string",
                    enum: props.info.supportedInputLanguages
                      .map((lang) => lang["iso639-3"]),
                    default: props.info.supportedInputLanguages[0]
                      ?.["iso639-3"],
                  },
                },
              },
              text: { type: "string", default: "" },
              options: {
                type: "object",
                required: ["outputSegmentationFormat"],
                properties: {
                  outputSegmentationFormat: {
                    type: "string",
                    enum: props.info
                      .supportedOutputSegmentationFormats as string[],
                    default: props.info.supportedOutputSegmentationFormats[0],
                  },
                },
              },
            },
          }}
          data={$input()}
          dataChangedCallback={set$input}
          submitCallback={handleSubmit}
          submitButton={$actionResult() !== "processing"}
        />
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const PhonemizerDemonstratorIsValidPhoneme: Component<{
  fqn: FunctionalityFqn;
  info: FunctionalityPhonemizer["info"];
}> = (props) => {
  const $prefersDark = usePrefersDark();

  const [$input, set$input] = createSignal<any>({});
  const [$actionResult, set$actionResult] = createSignal<
    FunctionalityActionResult<IsValidPhonemeResult> | null | "processing"
  >(null);

  const phonmeizerIsValidPhoneme = useAction(phonemizerIsValidPhonemeAction);

  async function handleSubmit() {
    if ($actionResult() === "processing") return;
    set$actionResult("processing");
    set$actionResult(
      await phonmeizerIsValidPhoneme(
        props.fqn,
        $input() as PhonemizerIsValidPhonemeActionInput,
      ),
    );
  }

  return (
    <div class={cls("card", $prefersDark() ? "bg-black" : "bg-white")}>
      <div class="card-body">
        <h2 class="card-title">
          Manual Invocation: <code>isValidPhoneme</code>
        </h2>
        <h3>Input:</h3>
        <Jsfe
          schema={{
            type: "object",
            required: ["segmentationFormat"],
            properties: {
              segmentationFormat: {
                type: "string",
                enum: props.info
                  .supportedOutputSegmentationFormats as string[],
                default: props.info.supportedOutputSegmentationFormats[0],
              },
              phoneme: { type: "string", default: "" },
            },
          }}
          data={$input()}
          dataChangedCallback={set$input}
          submitCallback={handleSubmit}
          submitButton={$actionResult() !== "processing"}
        />
        <Show when={$actionResult()}>
          {($actionResult) => (
            <>
              <h3>Result:</h3>
              <ActionJsonResultDisplayer actionResult={$actionResult()} />
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

const ActionJsonResultDisplayer: Component<{
  actionResult:
    | "processing"
    | ["error", "functionality_not_found"]
    | ["error", "functionality_type_mismatch", string]
    | ["error", "exception", { message: string; trace?: string }]
    | ["ok", any];
}> = ($props) => {
  return (
    <>
      {match($props.actionResult)
        .with(
          "processing",
          () => <LoadingSpan class="mx-auto" size="xl" />,
        )
        .with(
          ["error", "functionality_not_found"],
          () => "TODO: FUNCTIONALITY NOT FOUND",
        )
        .with(
          ["error", "functionality_type_mismatch", P._],
          ([_1, _2, t]) => <>TODO: FUNCTIONALITY TYPE MISMATCH: {t}</>,
        )
        .with(
          ["error", "exception", P._],
          ([_1, _2, { trace }]) => <>TODO: EXCEPTION: {trace}</>,
        )
        .with(
          ["ok", P._],
          ([_, result]) => <JsonViewer data={result} expand={"**"} />,
        )
        .exhaustive()}
    </>
  );
};

export function getFunctionalityTypeDisplayName(
  t: Functionality["type"],
): string {
  switch (t) {
    case "functionality:phonemizer":
      return "Phonemizer";
    case "functionality:duration_predictor":
      return "Duration Predictor";
    case "functionality:prosody_generator":
      return "Prosody Generator";
    default:
      t satisfies never;
      throw new Error("unreachable!");
  }
}
