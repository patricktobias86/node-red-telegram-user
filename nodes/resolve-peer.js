const { getClient, getPayload, peerId, peerType, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function ResolvePeer(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;

        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            const client = getClient(node, payload);

            try {
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const reference = payload.peer ?? payload.input ?? config.peer;
                const inputPeer = await resolveInputPeer(client, reference);
                const entity = await client.getEntity(inputPeer);
                send({
                    ...msg,
                    payload: {
                        reference,
                        peerId: peerId(inputPeer) ?? peerId(entity),
                        peerType: peerType(inputPeer),
                        inputPeer,
                        entity,
                    },
                });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error resolving peer: ${err.message}`, msg);
            }
        });
    }

    RED.nodes.registerType("resolve-peer", ResolvePeer);
};
