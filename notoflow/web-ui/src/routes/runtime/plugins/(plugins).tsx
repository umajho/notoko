import { type Component } from "solid-js";
import { Title } from "@solidjs/meta";

import { makeTitle } from "~/utils/titles";

export default (() => {
  return (
    <>
      <Title>{makeTitle("Plugins")}</Title>
    </>
  );
}) satisfies Component<{}>;
