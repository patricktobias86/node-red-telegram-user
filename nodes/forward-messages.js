const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function ForwardMessages(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;

        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            const client = getClient(node, payload);

            try {
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const fromPeer = await resolveInputPeer(client, payload.fromPeer ?? config.fromPeer);
                const toPeer = await resolveInputPeer(client, payload.toPeer ?? payload.peer ?? config.toPeer);
                const messages = payload.messageIds ?? payload.messages;
                if (messages === undefined || messages === null) throw new Error("No message IDs provided");

                const result = await client.forwardMessages(toPeer, {
                    messages,
                    fromPeer,
                    silent: payload.silent,
                    schedule: payload.schedule,
                    dropAuthor: payload.dropAuthor,
                    dropMediaCaptions: payload.dropMediaCaptions,
                    background: payload.background,
                    topMsgId: payload.topicId ?? payload.topMsgId,
                    sendAs: payload.sendAs,
                });
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error forwarding messages: ${err.message}`, msg);
            }
        });
    }

    RED.nodes.registerType("forward-messages", ForwardMessages);
};
