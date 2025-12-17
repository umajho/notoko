import { LiveQueryingClient } from "./live-querying-client";

// @ts-ignore
globalThis.liveQueryingClientSingleton ??= await LiveQueryingClient.make();

export function getLiveQueryingClientSingleton(): LiveQueryingClient {
  // @ts-ignore
  return globalThis.liveQueryingClientSingleton;
}
