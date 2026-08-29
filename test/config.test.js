const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const instances = [];
  class TelegramClientStub {
    constructor(session, id, hash, opts) {
      this.session = session;
      this.id = id;
      this.hash = hash;
      this.opts = opts;
      instances.push(this);
    }
    connect() { return Promise.resolve(); }
    isUserAuthorized() { return Promise.resolve(true); }
    disconnect() { return Promise.resolve(); }
  }
  class StringSessionStub {
    constructor(str) { this.str = str; }
  }

  let NodeCtor;
  let credentialDefinition;
  const RED = {
    nodes: {
      createNode(node, config) {
        node._events = {};
        node.credentials = config._credentials;
        node.on = (e, fn) => { node._events[e] = fn; };
        node.status = () => {};
      },
      registerType(name, ctor, options) {
        NodeCtor = ctor;
        credentialDefinition = options?.credentials;
      }
    }
  };

  proxyquire('../nodes/config.js', {
    teleproto: { TelegramClient: TelegramClientStub },
    'teleproto/sessions': { StringSession: StringSessionStub }
  })(RED);

  return { NodeCtor, instances, getCredentialDefinition: () => credentialDefinition };
}

describe('TelegramClientConfig', function() {
  it('creates only one client for identical sessions', async function() {
    const { NodeCtor, instances } = load();
    const cfg = { session: 'sess', api_id: 1, api_hash: 'hash' };
    const a = new NodeCtor(cfg);
    const b = new NodeCtor(cfg);
    assert.strictEqual(instances.length, 1);
    assert.strictEqual(a.client, b.client);
  });

  it('reuses session after node redeploy', async function() {
    const { NodeCtor, instances } = load();
    const cfg = { session: 'sess', api_id: 1, api_hash: 'hash' };
    const a = new NodeCtor(cfg);
    const b = new NodeCtor(cfg);
    await a._events.close();
    const c = new NodeCtor(cfg);
    assert.strictEqual(instances.length, 1);
    assert.strictEqual(b.client, c.client);
  });

  it('loads API hash and session from Node-RED credentials', function() {
    const { NodeCtor, instances, getCredentialDefinition } = load();
    new NodeCtor({ api_id: 1, _credentials: { session: 'secret-session', api_hash: 'secret-hash' } });

    assert.strictEqual(instances[0].session.str, 'secret-session');
    assert.strictEqual(instances[0].hash, 'secret-hash');
    assert.deepStrictEqual(getCredentialDefinition(), {
      api_hash: { type: 'password' },
      session: { type: 'password' }
    });
  });
});
