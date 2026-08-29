const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function setup() {
  let NodeCtor;
  let sent;
  const configNode = { client: {} };
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
        node.send = (msg) => { sent = msg; };
        node.log = () => {};
        node.error = () => {};
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return configNode; }
    }
  };

  proxyquire('../nodes/send-message.js', {
    teleproto: { TelegramClient: function() {} },
    'teleproto/Utils': { parseID: () => ({}) }
  })(RED);

  return { NodeCtor, getSent: () => sent };
}

describe('message property relay', function() {
  it('keeps non-payload properties on send-message output', async function() {
    const { NodeCtor, getSent } = setup();
    const node = new NodeCtor({ config: 'c', file: "" });
    const client = { sendMessage: async () => 'ok' };
    const msg = { foo: 'bar', payload: { client, chatId: 'me', message: 'hi' } };
    await node._events['input'](msg);
    const out = getSent();
    assert.strictEqual(out.foo, 'bar');
    assert.deepStrictEqual(out.payload.response, 'ok');
  });

  it('keeps fallback send response and explicit false options', async function() {
    const calls = [];
    const client = {
      sendMessage: async (peer, params) => {
        calls.push([peer, params]);
        if (calls.length === 1) throw new Error('resolve peer');
        return { id: 9 };
      },
      getInputEntity: async () => ({ peer: 'resolved' })
    };
    const { NodeCtor, getSent } = setup(client);
    const node = new NodeCtor({ config: 'c', file: '', silent: true, linkPreview: true });

    await node._events.input.call(node, { payload: { client, chatId: '123', message: 'hello', silent: false, linkPreview: false } });

    assert.strictEqual(calls[0][1].silent, false);
    assert.strictEqual(calls[0][1].linkPreview, false);
    assert.deepStrictEqual(getSent().payload, { response: { id: 9 } });
  });
});
