const { Api } = require("teleproto");
const { getInputChannel, getInputUser } = require("teleproto/Utils");
const { getClient, getPayload, peerType, resolveInputPeer } = require("./runtime");

const ADMIN_FIELDS = ["changeInfo", "postMessages", "editMessages", "deleteMessages", "banUsers", "inviteUsers", "pinMessages", "addAdmins", "anonymous", "manageCall", "other", "manageTopics", "postStories", "editStories", "deleteStories", "manageDirectMessages", "manageRanks", "manageLinkedPeers", "rank"];
const BANNED_FIELDS = ["untilDate", "viewMessages", "sendMessages", "sendMedia", "sendStickers", "sendGifs", "sendGames", "sendInline", "embedLinks", "sendPolls", "sendPhotos", "sendVideos", "sendRoundvideos", "sendAudios", "sendVoices", "sendDocs", "sendPlain", "sendReactions", "changeInfo", "inviteUsers", "pinMessages", "manageTopics"];
const pick = (source, fields) => Object.fromEntries(fields.filter(key => source[key] !== undefined).map(key => [key, source[key]]));

module.exports = function (RED) {
    function MemberManagement(config) {
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
                const member = await resolveInputPeer(client, payload.member ?? payload.user ?? config.member);
                const action = payload.action ?? config.action;
                let result;
                if (action === "kick") result = await client.kickParticipant(peer, member);
                else if (action === "ban") {
                    if (peerType(peer) !== "channel") throw new Error("Ban/restrict requires a supergroup or channel");
                    result = await client.editBanned(peer, member, { ...pick(payload, BANNED_FIELDS), viewMessages: true });
                } else if (action === "restrict") {
                    if (peerType(peer) !== "channel") throw new Error("Ban/restrict requires a supergroup or channel");
                    result = await client.editBanned(peer, member, pick(payload, BANNED_FIELDS));
                } else if (action === "unban") {
                    if (peerType(peer) !== "channel") throw new Error("Unban requires a supergroup or channel");
                    result = await client.editBanned(peer, member, {});
                }
                else if (action === "promote") result = await client.editAdmin(peer, member, pick(payload, ADMIN_FIELDS));
                else if (action === "demote") result = await client.editAdmin(peer, member, {});
                else if (action === "invite") {
                    result = peerType(peer) === "chat"
                        ? await client.invoke(new Api.messages.AddChatUser({ chatId: peer.chatId, userId: getInputUser(member), fwdLimit: payload.fwdLimit ?? 0 }))
                        : await client.invoke(new Api.channels.InviteToChannel({ channel: getInputChannel(peer), users: [getInputUser(member)] }));
                } else throw new Error(`Unsupported member action: ${action}`);
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error managing member: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("member-management", MemberManagement);
};
