const { TelegramClient } = require("teleproto");
const { parseID } = require("teleproto/Utils");
const { getPayload } = require("./runtime");

module.exports = function (RED) {
    function SendMessage(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function (msg) {
            const payload = getPayload(msg);
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('send-message input: ' + JSON.stringify(msg));
            }
            let chatId = payload.chatId ?? config.chatId;
            const message = payload.message ?? config.message;
            const parseMode = payload.parseMode ?? config.parseMode;
            const schedule = payload.schedule ?? config.schedule;
            const replyTo = payload.replyTo ?? config.replyTo;
            const attributes = payload.attributes ?? config.attributes;
            const formattingEntities = payload.formattingEntities ?? config.formattingEntities;
            const linkPreview = payload.linkPreview ?? config.linkPreview;
            const file = payload.file ?? config.file;
            const thumb = payload.thumb ?? config.thumb;
            const forceDocument = payload.forceDocument ?? config.forceDocument;
            const clearDraft = payload.clearDraft ?? config.clearDraft;
            const buttons = payload.buttons ?? config.buttons;
            const silent = payload.silent ?? config.silent;
            const supportStreaming = payload.supportStreaming ?? config.supportStreaming;
            const noforwards = payload.noforwards ?? config.noforwards;
            const commentTo = payload.commentTo ?? config.commentTo;
            const topMsgId = payload.topMsgId ?? config.topMsgId;

            /** @type {TelegramClient} */
            const client = payload.client ?? this.config?.client;

            if (!client) {
                node.error('No Telegram client available. Check account configuration.');
                return;
            }

            let peerId = chatId === "me" ? chatId : parseID(chatId);

            try {
                const params = {
                    message: message,
                    parseMode: parseMode,
                    replyTo: replyTo !== ""? replyTo:undefined,
                    attributes: attributes,
                    formattingEntities: formattingEntities !== ""? formattingEntities:undefined,
                    linkPreview: linkPreview,
                    file: file && file.length > 1 ? file : undefined,
                    thumb: thumb,
                    forceDocument: forceDocument,
                    clearDraft: clearDraft,
                    buttons: buttons !== "" ? buttons : undefined,
                    silent: silent,
                    supportStreaming: supportStreaming,
                    noforwards: noforwards,
                    commentTo: commentTo !== "" ? commentTo : undefined,
                    topMsgId: topMsgId !== "" ? topMsgId : undefined,
                };

                if (schedule) {
                    params.schedule = new Date(schedule).getTime() / 1000;
                }

                let response;
                if (chatId[0] === "@") { 
                    peerId = await client.getEntity(chatId);
                }
                

                try {
                    response = await client.sendMessage(peerId, params);
                } catch (error) {
                    const entity = await client.getInputEntity(peerId)
                    response = await client.sendMessage(entity, params);
                }

                const out = { ...msg, payload: { response } };
                node.send(out);
                if (debug) {
                    node.log('send-message output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error send message: ' + err.message);
            }

        });

    }

    RED.nodes.registerType('send-message', SendMessage);
};
