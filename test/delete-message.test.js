const assert = require('assert');

function setup(client) {
  let NodeCtor;
  let sent;
  const errors = [];
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (event, handler) => { node._events[event] = handler; };
        node.send = (msg) => { sent = msg; };
        node.log = () => {};
        node.error = (message) => errors.push(message);
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return { client }; }
    }
  };

  require('../nodes/delete-message.js')(RED);
  return { NodeCtor, errors, getSent: () => sent };
}

describe('delete-message node', function() {
  it('uses toolkit result handling and preserves input properties', async function() {
    const calls = [];
    const client = {
      deleteMessages: async (...args) => {
        calls.push(args);
        return ['deleted'];
      }
    };
    const { NodeCtor, errors, getSent } = setup(client);
    const node = new NodeCtor({ config: 'c' });

    await node._events.input.call(node, { foo: 'bar', payload: { chatId: 123, messageIds: [456], revoke: false } });

    assert.deepStrictEqual(calls, [[123, [456], { revoke: false }]]);
    assert.deepStrictEqual(getSent(), { foo: 'bar', payload: ['deleted'] });
    assert.deepStrictEqual(errors, []);
  });

  it('reports toolkit-captured failures without sending output', async function() {
    const client = {
      deleteMessages: async () => { throw new Error('denied'); }
    };
    const { NodeCtor, errors, getSent } = setup(client);
    const node = new NodeCtor({ config: 'c' });

    await node._events.input.call(node, { payload: { chatId: 123, messageIds: [456] } });

    assert.strictEqual(getSent(), undefined);
    assert.deepStrictEqual(errors, ['Error deleting message: denied']);
  });
});
