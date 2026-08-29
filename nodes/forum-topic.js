const { Api } = require("teleproto");
const { returnBigInt } = require("teleproto/Helpers");
const { getClient, getPayload, resolveInputPeer } = require("./runtime");

module.exports = function (RED) {
    function ForumTopic(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        const node = this;
        this.on("input", async function (msg, send, done) {
            send = send || node.send.bind(node);
            const payload = getPayload(msg);
            try {
                const client = getClient(node, payload);
                if (!client) throw new Error("No Telegram client available. Check account configuration.");
                const peer = await resolveInputPeer(client, payload.peer ?? config.peer);
                const action = payload.action ?? config.action ?? "list";
                const topicId = payload.topicId;
                let result;
                if (action === "create") {
                    if (!payload.title) throw new Error("No topic title provided");
                    result = await client.createForumTopic(peer, {
                        title: payload.title,
                        iconColor: payload.iconColor,
                        iconEmojiId: payload.iconEmojiId === undefined ? undefined : returnBigInt(payload.iconEmojiId),
                        sendAs: payload.sendAs,
                    });
                } else if (action === "edit" || action === "close" || action === "reopen") {
                    if (topicId === undefined) throw new Error("No topic ID provided");
                    result = await client.editForumTopic(peer, topicId, {
                        title: payload.title,
                        iconEmojiId: payload.iconEmojiId === undefined ? undefined : returnBigInt(payload.iconEmojiId),
                        closed: action === "close" ? true : action === "reopen" ? false : payload.closed,
                        hidden: payload.hidden,
                    });
                } else if (action === "delete") {
                    if (topicId === undefined) throw new Error("No topic ID provided");
                    result = await client.invoke(new Api.messages.DeleteTopicHistory({ peer, topMsgId: topicId }));
                } else if (action === "pin" || action === "unpin") {
                    if (topicId === undefined) throw new Error("No topic ID provided");
                    result = await client.updatePinnedForumTopic(peer, topicId, action === "pin");
                } else if (action === "get") {
                    if (topicId === undefined) throw new Error("No topic ID provided");
                    result = await client.getForumTopicsByID(peer, topicId);
                } else if (action === "list") {
                    result = await client.getForumTopics(peer, {
                        search: payload.search,
                        offsetDate: payload.offsetDate,
                        offsetId: payload.offsetId,
                        offsetTopic: payload.offsetTopic,
                        limit: payload.limit,
                    });
                } else throw new Error(`Unsupported forum topic action: ${action}`);
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error managing forum topic: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("forum-topic", ForumTopic);
};
