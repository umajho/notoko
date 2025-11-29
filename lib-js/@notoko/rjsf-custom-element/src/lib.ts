import r2wc from "@r2wc/react-to-web-component";

import { Wrapper } from "./impl";

export const RjsfElement = r2wc(Wrapper, {
  props: {
    dark: "boolean",
    schema: "json",
    data: "json",
  },
});
