const assert = require('assert');

function setup(modulePath, client) {
  let NodeCtor;
  let sent;
  const errors = [];
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (event, handler) => { node._events[event] = handler; };
        node.send = (msg) => { sent = msg; };
        node.error = (err) => errors.push(err);
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return { client }; }
    }
  };
  require(modulePath)(RED);
  return { NodeCtor, errors, getSent: () => sent };
}

describe('MTProto peer-aware nodes', function() {
  it('resolves and exposes a usable input peer', async function() {
    const inputPeer = { className: 'InputPeerUser', userId: 42 };
    const entity = { className: 'User', id: 42 };
    const client = {
      getInputEntity: async value => { assert.strictEqual(value, '@example'); return inputPeer; },
      getEntity: async value => { assert.strictEqual(value, inputPeer); return entity; }
    };
    const { NodeCtor, getSent } = setup('../nodes/resolve-peer.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { topic: 'keep', payload: { peer: 'https://t.me/example' } });
    assert.deepStrictEqual(getSent(), {
      topic: 'keep',
      payload: { reference: 'https://t.me/example', peerId: 42, peerType: 'user', inputPeer, entity }
    });
  });

  it('edits a peer-scoped message', async function() {
    const inputPeer = { className: 'InputPeerChannel', channelId: 7 };
    const client = {
      getInputEntity: async () => inputPeer,
      editMessage: async (...args) => { assert.deepStrictEqual(args, [inputPeer, {
        message: 10, text: '', parseMode: undefined, formattingEntities: undefined,
        linkPreview: false, file: undefined, forceDocument: undefined, buttons: undefined,
        schedule: undefined, invertMedia: undefined
      }]); return { id: 10 }; }
    };
    const { NodeCtor, getSent } = setup('../nodes/edit-message.js', client);
    const node = new NodeCtor({ config: 'c', linkPreview: true });
    await node._events.input.call(node, { payload: { peer: '@group', messageId: 10, text: '', linkPreview: false } });
    assert.deepStrictEqual(getSent().payload, { id: 10 });
  });

  it('forwards IDs with source and destination peer context', async function() {
    const from = { className: 'InputPeerChannel', channelId: 1 };
    const to = { className: 'InputPeerUser', userId: 2 };
    const client = {
      getInputEntity: async value => value === '@from' ? from : to,
      forwardMessages: async (peer, params) => {
        assert.strictEqual(peer, to);
        assert.strictEqual(params.fromPeer, from);
        assert.deepStrictEqual(params.messages, [3, 4]);
        assert.strictEqual(params.topMsgId, 9);
        return [{ id: 5 }];
      }
    };
    const { NodeCtor, getSent } = setup('../nodes/forward-messages.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { fromPeer: '@from', toPeer: '@to', messageIds: [3, 4], topicId: 9 } });
    assert.deepStrictEqual(getSent().payload, [{ id: 5 }]);
  });

  it('downloads media to a buffer by default', async function() {
    const message = { id: 6 };
    const buffer = Buffer.from('media');
    const client = {
      downloadMedia: async (source, params) => {
        assert.strictEqual(source, message);
        assert.strictEqual(params.outputFile, undefined);
        return buffer;
      }
    };
    const { NodeCtor, getSent } = setup('../nodes/download-media.js', client);
    const node = new NodeCtor({ config: 'c' });
    await node._events.input.call(node, { payload: { message } });
    assert.strictEqual(getSent().payload, buffer);
  });
});
