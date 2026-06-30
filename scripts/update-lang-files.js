const fs = require("fs");
const path = require("path");

const root = "C:/Users/Turgay0671/Desktop/cadro-project/html";
const srcFile = path.join(root, "page-content.js");
const src = fs.readFileSync(srcFile, "utf8");

// Parse all language sections from page-content.js
// Structure:
//   window.CADRO_PAGE_HTML = {
//     tr: { ... },
//     de: { ... },    // contains ar: { ... } inside
//     en: { ... },
//   };
//   window.CADRO_PAGE_HTML.de['key'] = `...`;
//   window.CADRO_PAGE_HTML.ar['key'] = `...`;
//   window.CADRO_PAGE_HTML.en['key'] = `...`;
//   window.CADRO_PAGE_HTML.ar['key'] = `...`;  (my additions)

function parseTemplateLiteral(str, startIdx) {
  if (str[startIdx] !== "`") return null;
  let i = startIdx + 1, content = "";
  while (i < str.length) {
    if (str[i] === "\\" && str[i + 1] === "`") { content += "`"; i += 2; continue; }
    if (str[i] === "\\" && str[i + 1] === "$" && str[i + 2] === "{") { content += "${"; i += 3; continue; }
    if (str[i] === "`") return { content, endIdx: i };
    if (str[i] === "$" && str[i + 1] === "{") {
      let depth = 1, expr = "${";
      i += 2;
      while (i < str.length && depth > 0) {
        if (str[i] === "{") depth++;
        if (str[i] === "}") depth--;
        expr += str[i];
        i++;
      }
      content += expr;
      continue;
    }
    content += str[i];
    i++;
  }
  return null;
}

function parseObjectBlock(text, blockStart) {
  // Parse a JS object block starting at blockStart (which should be the opening brace)
  // Returns { objectText, endIdx } where endIdx is the index of the closing brace
  if (text[blockStart] !== "{") return null;
  let depth = 0, inStr = false, quote = "", escape = false;
  let result = "";
  for (let i = blockStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === "\\") { result += ch; escape = true; continue; }
    if (inStr) {
      result += ch;
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { result += ch; inStr = true; quote = ch; continue; }
    if (ch === "{") { depth++; result += ch; continue; }
    if (ch === "}") {
      depth--;
      result += ch;
      if (depth === 0) return { objectText: result, endIdx: i };
      continue;
    }
    result += ch;
  }
  return null;
}

// Phase 1: Find the main window.CADRO_PAGE_HTML = { ... } object
const objStart = src.indexOf("window.CADRO_PAGE_HTML = {");
if (objStart < 0) throw new Error("Cannot find main object");
const mainBrace = src.indexOf("{", objStart);
if (mainBrace < 0) throw new Error("Cannot find main object brace");

// Parse the main object to extract tr, de, en blocks
const mainObj = parseObjectBlock(src, mainBrace);
if (!mainObj) throw new Error("Cannot parse main object");

// Extract the inner content of the main object (between outer braces)
const inner = mainObj.objectText;

// Now find each language section within the main object
// Scan for "  tr:", "  de:", "  en:" at the start of lines
const langBlocks = { tr: null, de: null, en: null, ar: null };

// Simple approach: find each key's brace and parse
for (const lang of ["tr", "de", "en"]) {
  const langPattern = "  " + lang + ": {";
  const langIdx = inner.indexOf(langPattern);
  if (langIdx < 0) { console.log(lang + ": block not found in main object"); continue; }

  const braceIdx = inner.indexOf("{", langIdx);
  if (braceIdx < 0) continue;

  const block = parseObjectBlock(inner, braceIdx);
  if (block) {
    langBlocks[lang] = block.objectText;
  }
}

// For AR, check if it's inside the DE block
if (langBlocks.de) {
  const arPattern = "  ar: {";
  const arIdx = langBlocks.de.indexOf(arPattern);
  if (arIdx >= 0) {
    const arBrace = langBlocks.de.indexOf("{", arIdx);
    if (arBrace >= 0) {
      const arBlock = parseObjectBlock(langBlocks.de, arBrace);
      if (arBlock) langBlocks.ar = arBlock.objectText;
    }
  }
}

// Phase 2: Extract key-value pairs from object blocks
function extractKeyValues(blockText) {
  const result = {};
  const re = /'([^']+)':\s*`([\s\S]*?)`\s*,?/g;
  let m;
  while ((m = re.exec(blockText)) !== null) {
    let val = m[2];
    if (val.startsWith("\n")) val = val.slice(1);
    result[m[1]] = val;
  }
  return result;
}

const langContent = { tr: {}, de: {}, en: {}, ar: {} };
for (const lang of ["tr", "de", "en"]) {
  if (langBlocks[lang]) {
    Object.assign(langContent[lang], extractKeyValues(langBlocks[lang]));
  }
}
if (langBlocks.ar) {
  Object.assign(langContent.ar, extractKeyValues(langBlocks.ar));
}

// Phase 3: Extract individual assignments
const assignRe = /window\.CADRO_PAGE_HTML\.(\w+)\['([^']+)'\]\s*=\s*`([\s\S]*?)`\s*;/g;
let m;
while ((m = assignRe.exec(src)) !== null) {
  const lang = m[1];
  const key = m[2];
  let val = m[3];
  if (val.startsWith("\n")) val = val.slice(1);
  if (langContent[lang]) {
    langContent[lang][key] = val;
  }
}

// Phase 4: Write language-specific files
for (const lang of ["tr", "de", "ar", "en"]) {
  const pages = langContent[lang];
  if (Object.keys(pages).length === 0) {
    console.log(lang + ": no pages found");
    continue;
  }

  const outLines = [
    "// Auto-generated page HTML map: " + lang,
    'window.CADRO_PAGE_HTML = window.CADRO_PAGE_HTML || {};',
    'window.CADRO_PAGE_HTML["' + lang + '"] = {',
  ];

  const keys = Object.keys(pages);
  for (let pi = 0; pi < keys.length; pi++) {
    const key = keys[pi];
    let val = pages[key];
    // Escape backticks and ${} within content
    val = val.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${");
    const comma = pi < keys.length - 1 ? "," : "";
    outLines.push("  '" + key + "': `" + val + "`" + comma);
  }

  outLines.push("};");
  outLines.push("");

  const outFile = path.join(root, "page-content-" + lang + ".js");
  fs.writeFileSync(outFile, outLines.join("\n"), "utf8");
  console.log(lang + ": written " + outFile + " (" + Object.keys(pages).length + " pages)");
}

console.log("Done");
