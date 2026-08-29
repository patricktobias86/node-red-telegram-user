const { Api } = require("teleproto");
const { getClient, getPayload, resolveInputPeer } = require("./runtime");

const FILTERS = {
    recent: Api.ChannelParticipantsRecent,
    admins: Api.ChannelParticipantsAdmins,
    bots: Api.ChannelParticipantsBots,
    contacts: Api.ChannelParticipantsContacts,
    banned: Api.ChannelParticipantsBanned,
    kicked: Api.ChannelParticipantsKicked,
};

module.exports = function (RED) {
    function Participants(config) {
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
                const filterName = payload.filter ?? config.filter;
                const Filter = FILTERS[filterName];
                if (filterName && !Filter) throw new Error(`Unsupported participant filter: ${filterName}`);
                const result = await client.getParticipants(peer, {
                    limit: payload.limit ?? config.limit,
                    offset: payload.offset,
                    search: payload.search,
                    filter: Filter ? new Filter({ q: payload.search ?? "" }) : undefined,
                    showTotal: payload.showTotal,
                });
                send({ ...msg, payload: result });
                done?.();
            } catch (err) {
                if (done) done(err);
                else node.error(`Error getting participants: ${err.message}`, msg);
            }
        });
    }
    RED.nodes.registerType("participants", Participants);
};
