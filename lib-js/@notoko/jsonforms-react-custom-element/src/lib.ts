import r2wc from "@r2wc/react-to-web-component";

import { Wrapper } from "./impl";

export const JsonFormsElement = r2wc(Wrapper, {
  props: {
    dark: "boolean",
    data: "json",
    schema: "json",
    uischema: "json",
    config: "json",
    uischemas: "json",
    readonly: "boolean",
    validationMode: "string",
    additionalErrors: "json",
  },
});
