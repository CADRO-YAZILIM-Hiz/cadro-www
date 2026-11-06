import fs from 'node:fs';
import path from 'node:path';
const root='c:/dev/cadro-www';
const checks=['en/index.html','en/hr-software.html','en/ats-recruitment-software.html','de/artikel-praediktive-hr.html','ar/mqal-ai-kvkk-amtthel.html'];
const tr=/[ğışİĞŞ]/;const findings=[];
for(const rel of checks){const s=fs.readFileSync(path.join(root,rel),'utf8');const main=(/<main[\s\S]*?<\/main>/i.exec(s)||[''])[0].replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');const visible=main.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');if((rel.startsWith('en/')||rel.startsWith('de/'))&&tr.test(visible))findings.push(`${rel}: Turkish characters remain in body`);if(rel.startsWith('ar/')&&/\b(the|and|with|for|this|guide|article)\b/i.test(visible)&&!/article|guide/i.test(rel))findings.push(`${rel}: English sentence remains in body`)}
console.log(JSON.stringify({checked:checks,findings},null,2));process.exitCode=findings.length?1:0;
