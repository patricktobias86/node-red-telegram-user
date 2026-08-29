const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Node-RED editors', function() {
  const nodesDir = path.join(__dirname, '..', 'nodes');
  const editors = fs.readdirSync(nodesDir).filter((name) => name.endsWith('.html'));

  for (const editor of editors) {
    it(`${editor} contains a valid bundled DXP editor`, function() {
      const html = fs.readFileSync(path.join(nodesDir, editor), 'utf8');
      const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/);

      assert(script, 'editor registration script is missing');
      assert(script[1].includes('/* node-red-dxp bundle:start */'));
      assert(script[1].includes('NodeRedTelegramEditor.createEditorNode'));
      assert.doesNotThrow(() => new Function(script[1]));

      const registrations = [];
      const RED = {
        nodes: {
          registerType: (name, definition) => registrations.push({ name, definition })
        }
      };
      new Function('RED', '$', script[1])(RED, () => {});
      assert.strictEqual(registrations.length, 1);
      assert.strictEqual(typeof registrations[0].definition.label, 'function');
    });
  }
});
