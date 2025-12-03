import { match, P } from "ts-pattern";

import { type Accessor, createSignal, onCleanup, type Setter } from "solid-js";
import { reconcile } from "solid-js/store";

import type {
  Functionality,
  FunctionalityFqn,
  Plugin,
  PluginId,
  PluginInstanceKey,
  PluginStatus,
} from "@notoko/definitions";

import {
  MessageToClient,
  type MessageToServer,
  type PluginManagerTopic,
} from "~/server/pl";

export class LiveQueryingClient {
  #socket: WebSocket | null = null;

  #signals: Record<string, {
    accessor: Accessor<any>;
    setter: Setter<any>;
    referenceCount: number;
  }> = {};

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#handleSocketOpen();
  }

  static async make() {
    const socket = await this.#makeGoodSocket();
    return new LiveQueryingClient(socket);
  }

  static async #makeGoodSocket(): Promise<WebSocket> {
    function makeSocket(): Promise<WebSocket> {
      const [promise, resolve, reject] = (() => {
        let resolve!: (socket: WebSocket) => void;
        let reject!: (reason?: any) => void;
        const p = new Promise<WebSocket>((resolve_, reject_) => {
          resolve = resolve_;
          reject = reject_;
        });
        return [p, resolve, reject];
      })();

      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(
        `${protocol}://${location.host}/live-querying.ws`,
      );

      socket.onmessage = (ev) => {
        const msg = MessageToClient.parse(JSON.parse(ev.data));
        if (msg === "ready") {
          resolve(socket);
        } else {
          throw new Error("LiveQueryingClient: BAD STATE!");
        }
      };
      // I don't know why (maybe it is due to I disabled SSR?), but solid-start
      // will pretend a WebSocket endpoint is working even if it is not ready.
      setTimeout(() =>
        reject(
          new Error(
            "LiveQueryingClient: this is likely an illusion of successful connection.",
          ),
        ), 100);

      return promise;
    }

    while (true) {
      try {
        const socket = await makeSocket();
        return socket;
      } catch {
        // TODO: backoff.
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async #handleSocketOpen() {
    console.info("LiveQueryingClient: `#onSocketOpen`.");

    for (const topicKey in this.#signals) {
      const topic = JSON.parse(topicKey) as PluginManagerTopic;
      this.#subscribe(topic);
    }

    this.#socket!.onmessage = (ev) => {
      const msg = MessageToClient.parse(JSON.parse(ev.data));

      match(msg)
        .with("ready", () => {
          console.info("LiveQueryingClient: ready");
        })
        .with(["update", P._, P._], ([_1, topic, v]) => {
          const topicKey = JSON.stringify(topic);
          const s = this.#signals[topicKey];
          if (s) {
            s.setter(reconcile(v, { merge: true }));
          } else {
            const text =
              "LiveQueryingClient: received update for unregistered topic";
            console.warn(text, { topic, value: v });
          }
        }).exhaustive();
    };

    this.#socket!.onerror = (ev) => {
      console.error("LiveQueryingClient: websocket error!", ev);
      this.#socket = null;
      navigator.locks.request("notoko:live-querying:reconnect", {
        ifAvailable: true,
      }, async () => {
        this.#socket = await LiveQueryingClient.#makeGoodSocket();
        this.#handleSocketOpen();
      });
    };
  }

  #sendMessage(msg: MessageToServer) {
    this.#socket?.send(JSON.stringify(msg));
  }

  #subscribe(topic: PluginManagerTopic) {
    this.#sendMessage(["subscribe", topic]);
  }

  #unsubscribe(topic: PluginManagerTopic) {
    this.#sendMessage(["unsubscribe", topic]);
  }

  #query<T>(topic: PluginManagerTopic, init: T): Accessor<T> {
    const topicKey = JSON.stringify(topic);
    let s = this.#signals[topicKey];
    if (!s) {
      const [accessor, setter] = createSignal(init);
      s = this.#signals[topicKey] = {
        accessor,
        setter,
        referenceCount: 0,
      };
      this.#subscribe(topic);
    }

    s.referenceCount += 1;
    onCleanup(() => {
      // FIXME: figure out why if this is not scheduled as a macrotask, it will
      // fall into an infinite loop of subscribe & unsubscribe.
      setTimeout(() => {
        s.referenceCount -= 1;
        if (!s.referenceCount) {
          this.#unsubscribe(topic);
          delete this.#signals[topicKey];
        }
      }, 0);
    });

    return s.accessor;
  }

  queryPluginIds(): Accessor<PluginId[] | "loading"> {
    return this.#query("pluginIds", "loading");
  }

  queryPluginInfo(
    pluginId: PluginId,
  ): Accessor<Plugin["info"] | "not_found" | "loading"> {
    return this.#query(["pluginInfo", pluginId], "loading");
  }

  queryPluginInstanceKeys(
    pluginId: PluginId,
  ): Accessor<null | PluginInstanceKey[] | "loading"> {
    return this.#query(["pluginInstanceKeys", pluginId], "loading");
  }

  queryPluginInstanceStatus(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<PluginStatus | "unknown" | "loading"> {
    return this.#query(
      ["pluginInstanceStatus", pluginId, instanceKey],
      "loading",
    );
  }

  queryPluginInstanceFunctionalityInfos(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<[FunctionalityFqn, any][] | "loading"> {
    return this.#query([
      "pluginInstanceFunctionalityInfos",
      pluginId,
      instanceKey,
    ], "loading");
  }

  queryPluginInstanceStaticConfiguration(
    pluginId: PluginId,
    instanceKey: PluginInstanceKey,
  ): Accessor<object | "loading"> {
    return this.#query([
      "pluginInstanceStaticConfiguration",
      pluginId,
      instanceKey,
    ], "loading");
  }

  queryFunctionalityInfo(
    functionalityFqn: FunctionalityFqn,
  ): Accessor<Functionality["info"] | "not_found" | "loading"> {
    return this.#query(["functionalityInfo", functionalityFqn], "loading");
  }
}
