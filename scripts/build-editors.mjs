import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodesDir = path.join(root, 'nodes');
const markerStart = '/* node-red-dxp bundle:start */';
const markerEnd = '/* node-red-dxp bundle:end */';

const result = await build({
  entryPoints: [path.join(root, 'editor/toolkit.js')],
  bundle: true,
  format: 'iife',
  globalName: 'NodeRedTelegramEditor',
  minify: true,
  write: false
});
const bundle = result.outputFiles[0].text.trim();
const block = `${markerStart}\n${bundle}\n${markerEnd}`;

for (const filename of await readdir(nodesDir)) {
  if (!filename.endsWith('.html')) continue;

  const filepath = path.join(nodesDir, filename);
  const source = await readFile(filepath, 'utf8');
  const markerPattern = new RegExp(`${markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const updated = markerPattern.test(source)
    ? source.replace(markerPattern, block)
    : source.replace('<script type="text/javascript">', `<script type="text/javascript">\n${block}`);

  await writeFile(filepath, updated);
}
