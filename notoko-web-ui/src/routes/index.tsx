import { action, redirect, useAction } from "@solidjs/router";

const redirectAction = action(async () => {
  "use server";
  throw redirect("/projects");
});

export default function Home() {
  useAction(redirectAction)();
}
