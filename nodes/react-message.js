const { Api } = require("teleproto");
const { returnBigInt } = require("teleproto/Helpers");
const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function ReactMessage(config) {
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
                const messageId = payload.messageId;
                if (messageId === undefined || messageId === null) throw new Error("No message ID provided");

                const values = payload.reactions ?? payload.reaction ?? config.reaction;
                const list = values === undefined || values === null || values === ""
                    ? []
                    : (Array.isArray(values) ? values : [values]).map(value => {
                        if (typeof value === "object") return value;
                        if (typeof value === "string" && value.startsWith("custom:")) {
                            return new Api.ReactionCustomEmoji({ documentId: returnBigInt(value.slice(7)) });
                        }
                        return new Api.ReactionEmoji({ emoticon: value });
                    });
                const result = await client.sendReaction(peer, messageId, list, payload.big, payload.addToRecent);
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error reacting to message: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("react-message", ReactMessage);
};
