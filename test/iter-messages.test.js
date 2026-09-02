const assert = require('assert');

describe('iter-messages', function() {
  it('reports a missing Telegram client without throwing', async function() {
    let NodeCtor;
    let reportedError;
    const RED = {
      nodes: {
        createNode(node) {
          node._events = {};
          node.on = (event, handler) => { node._events[event] = handler; };
          node.error = error => { reportedError = error; };
          node.log = () => {};
        },
        getNode() { return null; },
        registerType(name, ctor) { NodeCtor = ctor; }
      }
    };

    require('../nodes/iter-messages.js')(RED);
    const node = new NodeCtor({ config: 'missing-account' });

    await node._events.input.call(node, { payload: {} });

    assert.strictEqual(reportedError, 'No Telegram client available. Check account configuration.');
  });
});
