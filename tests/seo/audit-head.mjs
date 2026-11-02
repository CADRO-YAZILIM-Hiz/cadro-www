import fs from 'node:fs';
import path from 'node:path';
import { htmlFiles, inspectHead, root } from './metadata.mjs';

const failures = htmlFiles().flatMap(file => {
  const errors = inspectHead(fs.readFileSync(file, 'utf8'));
  return errors.length ? [{ file: path.relative(root, file), errors }] : [];
});
console.log(JSON.stringify({ checked: htmlFiles().length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;