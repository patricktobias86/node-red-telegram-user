const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function PinMessage(config) {
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
                const messageId = payload.messageId ?? config.messageId;
                const operation = payload.operation ?? config.operation ?? "pin";
                if (operation === "pin" && (messageId === undefined || messageId === null || messageId === "")) {
                    throw new Error("No message ID provided");
                }
                const params = { notify: payload.notify ?? config.notify, pmOneSide: payload.pmOneSide, topMsgId: payload.topicId };
                const result = operation === "unpin"
                    ? await client.unpinMessage(peer, messageId === "" ? undefined : messageId, params)
                    : await client.pinMessage(peer, messageId, params);
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error updating pinned message: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("pin-message", PinMessage);
};
