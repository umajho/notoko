import { match, P } from "ts-pattern";

import { eventHandler } from "vinxi/http";

import { PluginManagerSubscriber } from "@notoko/backend";

import { MessageToClient, MessageToServer } from "./pl";
import { getPluginManagerSingleton } from "./singletons";

const peerDataMap: Record<string, {
  pluginManagerSubscriber: PluginManagerSubscriber;
}> = {};

const pluginManager = getPluginManagerSingleton();

export default eventHandler({
  handler() {},
  websocket: {
    async open(peer) {
      peer.send(JSON.stringify("ready"));
    },
    async message(peer, msg_) {
      function sendMessage(msg: MessageToClient) {
        peer.send(JSON.stringify(msg));
      }

      const msg = MessageToServer.parse(msg_.json());
      match(msg)
        .with(["subscribe", P.select()], (topic) => {
          function sendUpdate(data: unknown) {
            sendMessage(["update", topic, data]);
          }

          const data = (peerDataMap[peer.id] ??= {
            pluginManagerSubscriber: new PluginManagerSubscriber(pluginManager),
          });
          const opts = { metadata: { peerId: peer.id } };
          match(topic)
            .with("pluginIds", () => {
              data.pluginManagerSubscriber
                .subscribePluginIds(sendUpdate, opts);
            })
            .with(["pluginInfo", P.select()], (pluginId) => {
              data.pluginManagerSubscriber
                .subscribePluginInfo(pluginId, sendUpdate, opts);
            })
            .with(["pluginInstanceKeys", P.select()], (pluginId) => {
              data.pluginManagerSubscriber
                .subscribePluginInstanceKeys(pluginId, sendUpdate, opts);
            })
            .with(
              ["pluginInstanceStatus", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber.subscribePluginInstanceStatus(
                  pluginId,
                  instanceKey,
                  sendUpdate,
                  opts,
                );
              },
            )
            .with(
              ["pluginInstanceFunctionalityInfos", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber
                  .subscribePluginInstanceFunctionalityInfos(
                    pluginId,
                    instanceKey,
                    sendUpdate,
                    opts,
                  );
              },
            )
            .with(
              ["pluginInstanceStaticConfiguration", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber
                  .subscribePluginInstanceStaticConfiguration(
                    pluginId,
                    instanceKey,
                    sendUpdate,
                    opts,
                  );
              },
            )
            .with(["functionalityInfo", P.select()], (fqn) => {
              data.pluginManagerSubscriber
                .subscribeFunctionalityInfo(fqn, sendUpdate, opts);
            })
            .exhaustive();
        })
        .with(["unsubscribe", P.select()], (topic) => {
          const data = peerDataMap[peer.id];
          if (!data) {
            console.warn("unsubscribe: no peer data!", { peerId: peer.id });
            return;
          }
          const opts = { metadata: { peerId: peer.id } };
          match(topic)
            .with("pluginIds", () => {
              data.pluginManagerSubscriber.unsubscribePluginIds(opts);
            })
            .with(["pluginInfo", P.select()], (pluginId) => {
              data.pluginManagerSubscriber
                .unsubscribePluginInfo(pluginId, opts);
            })
            .with(["pluginInstanceKeys", P.select()], (pluginId) => {
              data.pluginManagerSubscriber
                .unsubscribePluginInstanceKeys(pluginId, opts);
            })
            .with(
              ["pluginInstanceStatus", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber
                  .unsubscribePluginInstanceStatus(pluginId, instanceKey, opts);
              },
            )
            .with(
              ["pluginInstanceFunctionalityInfos", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber
                  .unsubscribePluginInstanceFunctionalityInfos(
                    pluginId,
                    instanceKey,
                    opts,
                  );
              },
            )
            .with(
              ["pluginInstanceStaticConfiguration", P._, P._],
              ([_1, pluginId, instanceKey]) => {
                data.pluginManagerSubscriber
                  .unsubscribePluginInstanceStaticConfiguration(
                    pluginId,
                    instanceKey,
                    opts,
                  );
              },
            )
            .with(["functionalityInfo", P.select()], (fqn) => {
              data.pluginManagerSubscriber
                .unsubscribeFunctionalityInfo(fqn, opts);
            })
            .exhaustive();
        })
        .exhaustive();
    },
    async close(peer, _details) {
      const data = peerDataMap[peer.id];
      if (data) {
        data.pluginManagerSubscriber.dispose();
        delete peerDataMap[peer.id];
      }
    },
    async error(peer, error) {
      console.error("live-querying websocket error!", {
        peerId: peer.id,
        error,
      });
      const data = peerDataMap[peer.id];
      if (data) {
        data.pluginManagerSubscriber.dispose();
        delete peerDataMap[peer.id];
      }
    },
  },
});
