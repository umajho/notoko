import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Wrapper } from "./impl";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Wrapper
      dark={true}
      schema={{ "type": "object" }}
      data={{}}
    />
  </StrictMode>,
);
