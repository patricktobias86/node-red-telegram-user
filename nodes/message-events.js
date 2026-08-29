const { Raw } = require("teleproto/events");
const { peerId, peerType } = require("./runtime");

function categoryFor(name) {
    if (/Delete.*Message/.test(name)) return "delete";
    if (/Reaction/.test(name)) return "reaction";
    if (/Read/.test(name)) return "read";
    if (/Typing/.test(name)) return "typing";
    if (/Participant/.test(name)) return "participant";
    if (/ForumTopic|Topic/.test(name)) return "topic";
    if (/Pinned/.test(name)) return "pin";
    return "other";
}

module.exports = function (RED) {
    function MessageEvents(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;
        const client = this.config?.client;
        if (!client) {
            node.error("No Telegram client available. Check account configuration.");
            return;
        }

        const selected = new Set((config.categories || "delete,reaction,read,typing,participant,topic,pin").split(",").map(v => v.trim()).filter(Boolean));
        const handler = update => {
            const updateType = update?.className ?? update?.constructor?.name ?? "UnknownUpdate";
            const category = categoryFor(updateType);
            if (!selected.has("all") && !selected.has(category)) return;
            const peer = update.peer ?? update.peerId ?? update.channelId ?? update.chatId ?? update.userId;
            node.send({ payload: { update, updateType, category, peer, peerId: peerId(peer) ?? peer, peerType: peerType(peer) } });
        };
        const event = new Raw({});
        try {
            client.addEventHandler(handler, event);
        } catch (err) {
            node.error(`Error registering update handler: ${err.message}`);
        }
        this.on("close", () => {
            try {
                client.removeEventHandler(handler, event);
            } catch (err) {
                node.error(`Error removing update handler: ${err.message}`);
            }
        });
    }
    RED.nodes.registerType("message-events", MessageEvents);
};
