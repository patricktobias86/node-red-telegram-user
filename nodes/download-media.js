const { getClient, getPayload } = require("./runtime");

module.exports = function (RED) {
    function DownloadMedia(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;

        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            const client = getClient(node, payload);

            try {
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const source = payload.message ?? payload.media;
                if (!source) throw new Error("No Telegram message or media provided");
                const result = await client.downloadMedia(source, {
                    outputFile: (payload.outputFile ?? config.outputFile) || undefined,
                    thumb: payload.thumb,
                    progressCallback: payload.progressCallback,
                });
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error downloading media: ${err.message}`, msg);
            }
        });
    }

    RED.nodes.registerType("download-media", DownloadMedia);
};
