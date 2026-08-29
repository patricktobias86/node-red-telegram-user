function getPayload(msg) {
    return msg && typeof msg.payload === "object" && msg.payload !== null
        ? msg.payload
        : {};
}

function getClient(node, payload) {
    return payload.client ?? node.config?.client;
}

function normalizeTelegramReference(value) {
    if (typeof value !== "string") return value;

    try {
        const url = new URL(value);
        if (url.hostname !== "t.me" && url.hostname !== "www.t.me") return value;
        const segments = url.pathname.split("/").filter(Boolean);
        const username = segments.length === 1 ? segments[0] : undefined;
        return username && /^[A-Za-z0-9_]+$/.test(username) ? `@${username}` : value;
    } catch {
        return value;
    }
}

async function resolveInputPeer(client, value) {
    if (value === undefined || value === null || value === "") {
        throw new Error("No Telegram peer provided");
    }
    return client.getInputEntity(normalizeTelegramReference(value));
}

function peerType(peer) {
    const name = peer?.className ?? peer?.constructor?.name ?? "";
    if (name.includes("User") || name.includes("Self")) return "user";
    if (name.includes("Channel")) return "channel";
    if (name.includes("Chat")) return "chat";
    return "unknown";
}

function peerId(peer) {
    return peer?.userId ?? peer?.channelId ?? peer?.chatId ?? peer?.id;
}

module.exports = {
    getPayload,
    getClient,
    normalizeTelegramReference,
    resolveInputPeer,
    peerType,
    peerId,
};
