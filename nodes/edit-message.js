const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function EditMessage(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;

        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            const client = getClient(node, payload);

            try {
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const peer = await resolveInputPeer(client, payload.peer ?? payload.chatId ?? config.peer);
                const message = payload.messageId ?? payload.message ?? config.messageId;
                if (message === undefined || message === null || message === "") throw new Error("No message ID provided");

                const result = await client.editMessage(peer, {
                    message,
                    text: payload.text ?? config.text,
                    parseMode: payload.parseMode ?? config.parseMode,
                    formattingEntities: payload.formattingEntities,
                    linkPreview: payload.linkPreview ?? config.linkPreview,
                    file: payload.file,
                    forceDocument: payload.forceDocument,
                    buttons: payload.buttons,
                    schedule: payload.schedule,
                    invertMedia: payload.invertMedia,
                });
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error editing message: ${err.message}`, msg);
            }
        });
    }

    RED.nodes.registerType("edit-message", EditMessage);
};
