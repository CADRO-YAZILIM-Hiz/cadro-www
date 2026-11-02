import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

export const root = fileURLToPath(new URL('../../', import.meta.url));

export function htmlFiles(directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'tests', 'assets', 'md'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}

export function elements(node, predicate) {
  return [ ...(predicate(node) ? [node] : []),
    ...(node.childNodes || []).flatMap(child => elements(child, predicate)) ];
}

export function attribute(node, name) {
  return node.attrs?.find(attr => attr.name === name)?.value;
}

export function inspectHead(html) {
  // Browsers consume the transport BOM before HTML tokenization; embedded BOMs remain text.
  const document = parse(html.replace(/^\uFEFF/, ''), { sourceCodeLocationInfo: true });
  const head = elements(document, node => node.tagName === 'head')[0];
  const isMetadata = node => node.tagName === 'title'
    || (node.tagName === 'meta' && ['description', 'robots'].includes(attribute(node, 'name')?.toLowerCase()))
    || (node.tagName === 'link' && (attribute(node, 'rel')?.split(/\s+/).includes('canonical') || attribute(node, 'hreflang')));
  const inside = new Set(elements(head, isMetadata));
  const errors = elements(document, isMetadata).filter(node => !inside.has(node))
    .map(node => `${node.tagName} ${attribute(node, 'name') || attribute(node, 'rel') || ''} outside head at line ${node.sourceCodeLocation?.startLine}`);
  const canonicals = elements(head, node => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
  if (!canonicals.length) errors.push('No canonical in parsed head');
  if (!elements(head, node => node.tagName === 'title').length) errors.push('No title in parsed head');
  if (!elements(head, node => node.tagName === 'meta' && attribute(node, 'name') === 'description').length) errors.push('No description in parsed head');
  return errors;
}