const assert = require('assert');
const { Api } = require('teleproto');

function setup(modulePath, client) {
  let NodeCtor;
  let sent;
  const RED = { nodes: {
    createNode(node) {
      node._events = {};
      node.on = (event, handler) => { node._events[event] = handler; };
      node.send = message => { sent = message; };
      node.error = () => {};
    },
    registerType(name, ctor) { NodeCtor = ctor; },
    getNode() { return { client }; }
  }};
  require(modulePath)(RED);
  return { NodeCtor, getSent: () => sent };
}

describe('extended MTProto nodes', function() {
  it('builds Unicode and custom emoji reactions', async function() {
    const peer = new Api.InputPeerUser({ userId: 1, accessHash: 2 });
    const client = {
      getInputEntity: async () => peer,
      sendReaction: async (resolved, id, reactions) => {
        assert.strictEqual(resolved, peer);
        assert.strictEqual(id, 3);
        assert.strictEqual(reactions[0].emoticon, '👍');
        assert.strictEqual(reactions[1].documentId.toString(), '99');
        return { ok: true };
      }
    };
    const { NodeCtor, getSent } = setup('../nodes/react-message.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { peer: '@user', messageId: 3, reactions: ['👍', 'custom:99'] } });
    assert.deepStrictEqual(getSent().payload, { ok: true });
  });

  it('pins a peer-scoped message with notification choice', async function() {
    const peer = { className: 'InputPeerChannel', channelId: 1 };
    const client = {
      getInputEntity: async () => peer,
      pinMessage: async (...args) => { assert.deepStrictEqual(args, [peer, 5, { notify: false, pmOneSide: undefined, topMsgId: 8 }]); return 'pinned'; }
    };
    const { NodeCtor, getSent } = setup('../nodes/pin-message.js', client);
    const node = new NodeCtor({ config: 'c', operation: 'pin', notify: true });
    await node._events.input.call(node, { payload: { peer: '@forum', messageId: 5, topicId: 8, notify: false } });
    assert.strictEqual(getSent().payload, 'pinned');
  });

  it('marks messages, mentions, and reactions read', async function() {
    const peer = { className: 'InputPeerUser', userId: 1 };
    const invoked = [];
    const client = {
      getInputEntity: async () => peer,
      markAsRead: async (p, ids, params) => { assert.deepStrictEqual([p, ids, params], [peer, [4, 5], { maxId: undefined, clearMentions: true, topMsgId: undefined }]); return true; },
      invoke: async request => { invoked.push(request); return 'reactions-read'; }
    };
    const { NodeCtor, getSent } = setup('../nodes/mark-read.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { peer: '@user', messageIds: [4, 5], clearMentions: true, clearReactions: true } });
    assert.strictEqual(invoked[0].className, 'messages.ReadReactions');
    assert.deepStrictEqual(getSent().payload, { read: true, reactions: 'reactions-read' });
  });

  it('loads participants with selected channel filter', async function() {
    const peer = { className: 'InputPeerChannel', channelId: 1 };
    const client = {
      getInputEntity: async () => peer,
      getParticipants: async (p, params) => { assert.strictEqual(params.filter.className, 'ChannelParticipantsAdmins'); return ['admin']; }
    };
    const { NodeCtor, getSent } = setup('../nodes/participants.js', client);
    const node = new NodeCtor({ config: 'c', filter: 'admins', limit: 10 });
    await node._events.input.call(node, { payload: { peer: '@group' } });
    assert.deepStrictEqual(getSent().payload, ['admin']);
  });

  it('uses permission-aware admin editing', async function() {
    const peer = { className: 'InputPeerChannel', channelId: 1 };
    const member = { className: 'InputPeerUser', userId: 2 };
    const client = {
      getInputEntity: async value => value === '@group' ? peer : member,
      editAdmin: async (p, m, rights) => { assert.deepStrictEqual([p, m, rights.deleteMessages], [peer, member, true]); return 'promoted'; }
    };
    const { NodeCtor, getSent } = setup('../nodes/member-management.js', client);
    const node = new NodeCtor({ config: 'c', action: 'kick' });
    await node._events.input.call(node, { payload: { peer: '@group', member: '@user', action: 'promote', deleteMessages: true } });
    assert.strictEqual(getSent().payload, 'promoted');
  });

  it('uses basic-group invite RPC with an InputUser', async function() {
    const peer = new Api.InputPeerChat({ chatId: 10 });
    const member = new Api.InputPeerUser({ userId: 2, accessHash: 3 });
    const client = {
      getInputEntity: async value => value === 'group' ? peer : member,
      invoke: async request => {
        assert.strictEqual(request.className, 'messages.AddChatUser');
        assert.strictEqual(request.chatId.toString(), '10');
        assert.strictEqual(request.userId.className, 'InputUser');
        return 'invited';
      }
    };
    const { NodeCtor, getSent } = setup('../nodes/member-management.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { peer: 'group', member: 'user', action: 'invite' } });
    assert.strictEqual(getSent().payload, 'invited');
  });

  it('uses channel invite RPC with InputChannel and InputUser', async function() {
    const peer = new Api.InputPeerChannel({ channelId: 10, accessHash: 11 });
    const member = new Api.InputPeerUser({ userId: 2, accessHash: 3 });
    const client = {
      getInputEntity: async value => value === 'channel' ? peer : member,
      invoke: async request => {
        assert.strictEqual(request.className, 'channels.InviteToChannel');
        assert.strictEqual(request.channel.className, 'InputChannel');
        assert.strictEqual(request.users[0].className, 'InputUser');
        return 'invited';
      }
    };
    const { NodeCtor, getSent } = setup('../nodes/member-management.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { peer: 'channel', member: 'user', action: 'invite' } });
    assert.strictEqual(getSent().payload, 'invited');
  });

  it('lists forum topics inside resolved forum peer', async function() {
    const peer = { className: 'InputPeerChannel', channelId: 1 };
    const client = { getInputEntity: async () => peer, getForumTopics: async (p, params) => { assert.strictEqual(params.limit, 20); return ['topic']; } };
    const { NodeCtor, getSent } = setup('../nodes/forum-topic.js', client);
    const node = new NodeCtor({ config: 'c', action: 'list' });
    await node._events.input.call(node, { payload: { peer: '@forum', limit: 20 } });
    assert.deepStrictEqual(getSent().payload, ['topic']);
  });

  it('projects selected raw update categories and removes handler on close', function() {
    let handler;
    let removed;
    const client = {
      addEventHandler(fn) { handler = fn; },
      removeEventHandler(fn) { removed = fn; }
    };
    const { NodeCtor, getSent } = setup('../nodes/message-events.js', client);
    const node = new NodeCtor({ config: 'c', categories: 'reaction' });
    handler({ className: 'UpdateMessageReactions', peer: { className: 'PeerChannel', channelId: 7 } });
    assert.strictEqual(getSent().payload.category, 'reaction');
    assert.strictEqual(getSent().payload.peerId, 7);
    node._events.close();
    assert.strictEqual(removed, handler);
  });
});
