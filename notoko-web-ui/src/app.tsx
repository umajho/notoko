import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import { usePrefersDark } from "@solid-primitives/media";

import "@shoelace-style/shoelace/dist/themes/light.css";
import "@shoelace-style/shoelace/dist/themes/dark.css";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/rating/rating.js";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";

import "./app.css";

import Nav from "~/components/Nav";

import { cls } from "./utils/cls";

export default function App() {
  setBasePath("/node_modules/@shoelace-style/shoelace/dist");

  const $prefersDark = usePrefersDark();

  return (
    <Router
      root={($props) => (
        <MetaProvider>
          <div class={cls("contents", $prefersDark() && "sl-theme-dark")}>
            <Nav />
            <Suspense>{$props.children}</Suspense>
          </div>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
