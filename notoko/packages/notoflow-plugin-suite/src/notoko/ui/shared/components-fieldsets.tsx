import { match, P } from "ts-pattern";
import type { infer as ZInfer, ZodType } from "zod";

import type { FunctionComponent } from "preact";
import {
  type Signal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";

import {
  DurationPrediction,
  EnergyPrediction,
  type FeaturePredictionOverrideSupport,
  PitchPrediction,
} from "../../definitions";

import { type ButtonTabEntry, ButtonTabs } from "./components-rudimentary";
import {
  JsonTextarea,
  NumberInputThatCanBeFallbackToTextInput,
} from "./components-utils";

function FieldsetFeaturePrediction<T extends ZodType>(props: {
  featureName: string;
  predictionDataPlaceholderText: string;
  $predictionData: Signal<ZInfer<T> | null>;
  predictionDataSchemata: T;
}) {
  const $isPredictionDataValid = useComputed(() =>
    props.$predictionData.value !== null
  );

  return (
    <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
      <legend class="fieldset-legend">{props.featureName}</legend>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">
          {props.featureName} Prediction
          {(!$isPredictionDataValid.value) && (
            <span class="text-error text-xs italic">
              (*invalid)
            </span>
          )}
        </legend>
        <JsonTextarea
          placeholder={props.predictionDataPlaceholderText}
          initialTextValue={props.$predictionData.value !== null
            ? JSON.stringify(props.$predictionData.value)
            : ""}
          onInputDataOrNullIfInvalid={(v) => props.$predictionData.value = v}
          dataSchemata={props.predictionDataSchemata}
        />
      </fieldset>
    </fieldset>
  );
}

export const FieldsetFeaturePredictionDuration: FunctionComponent<{
  $predictionData: Signal<DurationPrediction | null>;
}> = (props) => {
  return (
    <FieldsetFeaturePrediction
      featureName="Duration"
      predictionDataPlaceholderText='{ "durationTicks2d": …, "ticksPerSecond": … }'
      $predictionData={props.$predictionData}
      predictionDataSchemata={DurationPrediction}
    />
  );
};

export const FieldsetFeaturePredictionPitch: FunctionComponent<{
  $predictionData: Signal<PitchPrediction | null>;
}> = (props) => {
  return (
    <FieldsetFeaturePrediction
      featureName="Pitch"
      predictionDataPlaceholderText='{ "pitchHz2d": …, }'
      $predictionData={props.$predictionData}
      predictionDataSchemata={PitchPrediction}
    />
  );
};

export const FieldsetFeaturePredictionEnergy: FunctionComponent<{
  $predictionData: Signal<EnergyPrediction | null>;
}> = (props) => {
  return (
    <FieldsetFeaturePrediction
      featureName="Energy"
      predictionDataPlaceholderText='{ "energyZScore2d": …, }'
      $predictionData={props.$predictionData}
      predictionDataSchemata={EnergyPrediction}
    />
  );
};

function FieldsetPredictFeatureOptions<T extends ZodType, U = ZInfer<T>>(
  props: {
    featureName: string;
    globalControlName: string;
    featurePredictionOverrideSupport: FeaturePredictionOverrideSupport;
    predictionOverrideDataPlaceholderText: string;
    $options: Signal<["simple", number] | ["override", U] | "invalid">;
    validateGlobalControlValue: (value: number) => boolean;
    predictionDataSchemata: T;
  },
) {
  const $mode = useSignal<"simple" | "override">("override");
  const $modeTabEntries = useComputed<ButtonTabEntry[]>(() => [
    {
      name: "Override",
      isActive: $mode.value === "override",
      isDisabled: props.featurePredictionOverrideSupport === "forbidden",
      onClick: () => $mode.value = "override",
    },
    {
      name: "Simple",
      isActive: $mode.value === "simple",
      isDisabled: props.featurePredictionOverrideSupport === "required",
      onClick: () => $mode.value = "simple",
    },
  ]);
  useSignalEffect(() => {
    match([$mode.value, props.featurePredictionOverrideSupport])
      .with(["override", "forbidden"], () => $mode.value = "simple")
      .with(["simple", "required"], () => $mode.value = "override")
      .otherwise(() => {});
  });

  const $globalControlValue = useSignal(
    match(props.$options.value)
      .with(["simple", P.select()], (v) => v)
      .otherwise(() => 1),
  );
  const $overrideData = useSignal(
    match(props.$options.value)
      .returnType<U | null>()
      .with(["override", P.select()], (v) => v as any)
      .otherwise(() => null),
  );

  useSignalEffect(() =>
    match($mode.value)
      .with("simple", () => {
        props.$options.value = match($globalControlValue.value)
          .returnType<["simple", number] | "invalid">()
          .with(P.when(props.validateGlobalControlValue), (v) => ["simple", v])
          .otherwise((v) => "invalid");
      })
      .with("override", () => {
        props.$options.value = match($overrideData.value)
          .returnType<["override", U] | "invalid">()
          .with(P.nonNullable, (v) => ["override", v as any])
          .otherwise(() => ("invalid" as const));
      }).exhaustive()
  );

  return (
    <fieldset class="fieldset border-base-300 rounded-box w-full border p-4 gap-4">
      <legend class="fieldset-legend">{props.featureName}</legend>
      <ButtonTabs $tabs={$modeTabEntries} />
      {match($mode.value)
        .with("override", () => (
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              {props.featureName} Prediction
              {(props.$options.value === "invalid") && (
                <span class="text-error text-xs italic">
                  (*invalid)
                </span>
              )}
            </legend>
            <JsonTextarea
              placeholder={props.predictionOverrideDataPlaceholderText}
              initialTextValue={match(props.$options.value)
                .with(["override", P.select()], (v) => JSON.stringify(v))
                .otherwise(() => "")}
              onInputDataOrNullIfInvalid={(v) => $overrideData.value = v as any}
              dataSchemata={props.predictionDataSchemata}
            />
          </fieldset>
        )).with("simple", () => (
          <label class="floating-label">
            <span>
              {props.globalControlName}
              {(props.$options.value === "invalid") &&
                (
                  <span class="text-error text-xs italic">
                    (*invalid)
                  </span>
                )}
            </span>
            <NumberInputThatCanBeFallbackToTextInput
              initialValue={$globalControlValue.value}
              step={0.05}
              min={0}
              onInput={(v) => $globalControlValue.value = v}
            />
          </label>
        )).exhaustive()}
    </fieldset>
  );
}

export const FieldsetPredictFeatureOptionsDuration: FunctionComponent<{
  featurePredictionOverrideSupport: FeaturePredictionOverrideSupport;
  $options: Signal<["speed", number] | ["override", object] | "invalid">;
}> = (props) => {
  const $options = useSignal(
    match(props.$options.value)
      .returnType<["simple", number] | ["override", object] | "invalid">()
      .with(["speed", P.select()], (v) => ["simple", v])
      .otherwise((v) => v),
  );
  useSignalEffect(() => {
    props.$options.value = match($options.value)
      .returnType<["speed", number] | ["override", object] | "invalid">()
      .with(["simple", P.select()], (v) => ["speed", v])
      .otherwise((v) => v);
  });

  return (
    <FieldsetPredictFeatureOptions
      featureName="Duration"
      globalControlName="Speed"
      featurePredictionOverrideSupport={props.featurePredictionOverrideSupport}
      predictionOverrideDataPlaceholderText='{ "durationTicks2d": …, "ticksPerSecond": … }'
      $options={$options}
      validateGlobalControlValue={(v) => v > 0}
      predictionDataSchemata={DurationPrediction}
    />
  );
};

export const FieldsetPredictFeatureOptionsPitch: FunctionComponent<{
  featurePredictionOverrideSupport: FeaturePredictionOverrideSupport;
  $options: Signal<["simple", number] | ["override", object] | "invalid">;
}> = (props) => {
  return (
    <FieldsetPredictFeatureOptions
      featureName="Pitch"
      globalControlName="Control"
      featurePredictionOverrideSupport={props.featurePredictionOverrideSupport}
      predictionOverrideDataPlaceholderText='{ "pitchHz2d": …, }'
      $options={props.$options}
      validateGlobalControlValue={(v) => v > 0}
      predictionDataSchemata={PitchPrediction}
    />
  );
};

export const FieldsetPredictFeatureOptionsEnergy: FunctionComponent<{
  featurePredictionOverrideSupport: FeaturePredictionOverrideSupport;
  $options: Signal<["simple", number] | ["override", object] | "invalid">;
}> = (props) => {
  return (
    <FieldsetPredictFeatureOptions
      featureName="Energy"
      globalControlName="Control"
      featurePredictionOverrideSupport={props.featurePredictionOverrideSupport}
      predictionOverrideDataPlaceholderText='{ "energyZScore2d": …, }'
      $options={props.$options}
      validateGlobalControlValue={(v) => v > 0}
      predictionDataSchemata={EnergyPrediction}
    />
  );
};
