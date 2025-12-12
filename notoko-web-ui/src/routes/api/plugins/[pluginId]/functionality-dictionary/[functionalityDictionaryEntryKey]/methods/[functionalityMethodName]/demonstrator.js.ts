"use server";

import { match, P } from "ts-pattern";

import type { APIEvent } from "@solidjs/start/server";

import { useApiPluginsParams } from "~/utils/routing";
import { getPluginManagerSingleton } from "~/server/singletons";
import { makeFunctionalityDictionaryEntryFqn } from "@notoko/definitions";

export async function GET({ params: rawParams }: APIEvent): Promise<Response> {
  const params = useApiPluginsParams(rawParams);

  const pm = getPluginManagerSingleton();

  const result = pm.getFunctionalityDemonstratorMethodUiSourceCode(
    makeFunctionalityDictionaryEntryFqn(
      params.$pluginId()!,
      params.$functionalityDictionaryEntryKey()!,
    ),
    params.$functionalityMethodName()!,
  );

  return match(result)
    .with(["ok", P.select()], (code) => makeResponse(code))
    .with(P._, (result) => {
      console.error(
        "TODO: handle error in the route to get `demonstrator.js`",
        result,
      );
      return makeResponse(null);
    }).exhaustive();
}

function makeResponse(sourceCode: string | null) {
  return new Response(sourceCode, {
    headers: { "Content-Type": "text/javascript" },
    status: typeof sourceCode === "string" ? 200 : 404,
  });
}
