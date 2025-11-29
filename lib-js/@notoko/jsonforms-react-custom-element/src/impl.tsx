import { useCallback, useRef } from "react";

import {
  materialCells,
  materialRenderers,
} from "@jsonforms/material-renderers";
import { JsonForms } from "@jsonforms/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const lightTheme = createTheme({ palette: { mode: "light" } });
const darkTheme = createTheme({ palette: { mode: "dark" } });

export function Wrapper(props: {
  dark: boolean;
  data: any;
  schema?: any;
  uischema?: any;
  config?: any;
  uischemas?: any;
  readonly?: boolean;
  validationMode?: any;
  i18n?: any;
  additionalErrors?: any;
}) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((newData: any) => {
    const ev = new Event("jsonforms:change", { bubbles: true });
    (ev as any).data = newData;
    divRef.current?.dispatchEvent(ev);
  }, []);

  return (
    <div style={{ display: "contents" }} ref={divRef}>
      <ThemeProvider theme={props.dark ? darkTheme : lightTheme}>
        <JsonForms
          {...props}
          data={props.data ?? {}}
          onChange={handleChange}
          renderers={materialRenderers}
          cells={materialCells}
        />
      </ThemeProvider>
    </div>
  );
}
