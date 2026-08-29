const { Api } = require("teleproto");
const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function MarkRead(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;
        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            try {
                const client = getClient(node, payload);
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const peer = await resolveInputPeer(client, payload.peer ?? payload.chatId ?? config.peer);
                const messageIds = payload.messageIds ?? payload.messageId;
                const read = await client.markAsRead(peer, messageIds, {
                    maxId: payload.maxId,
                    clearMentions: payload.clearMentions,
                    topMsgId: payload.topicId,
                });
                let reactions;
                if (payload.clearReactions) {
                    reactions = await client.invoke(new Api.messages.ReadReactions({ peer, topMsgId: payload.topicId }));
                }
                send({ ...msg, payload: { read, reactions } });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error marking messages read: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("mark-read", MarkRead);
};
