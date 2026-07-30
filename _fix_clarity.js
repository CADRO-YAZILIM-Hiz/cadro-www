const fs = require('fs');
const path = require('path');

const clarityBlock = `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xuly9fxhfn");
</script>`;

// Pattern to match a Clarity script block (with any whitespace)
const clarityPattern = /[\s\S]*?<script\s+type="text\/javascript">[\s\S]*?clarity\.ms\/tag[\s\S]*?<\/script>/g;

let totalFiles = 0;
let fixedFiles = 0;
let removedDupes = 0;

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.name.endsWith('.html')) {
            totalFiles++;
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Count all clarity blocks
            const matches = [...content.matchAll(new RegExp(clarityPattern.source, 'g'))];
            
            if (matches.length <= 1) continue; // OK, no dupes
            
            // Find <body> position
            const bodyMatch = content.match(/<body[^>]*>/i);
            const bodyIdx = bodyMatch ? bodyMatch.index : content.length;
            
            // Remove clarity blocks that appear after <body>
            let offset = 0;
            let removed = 0;
            for (const m of matches) {
                if (m.index > bodyIdx) {
                    content = content.slice(0, m.index - offset) + content.slice(m.index + m[0].length - offset);
                    offset += m[0].length;
                    removed++;
                }
            }
            
            if (removed > 0) {
                fs.writeFileSync(fullPath, content, 'utf8');
                fixedFiles++;
                removedDupes += removed;
            }
        }
    }
}

walkDir('c:/dev/Cadro-html');
console.log(`Total HTML: ${totalFiles}`);
console.log(`Fixed files: ${fixedFiles}`);
console.log(`Removed duplicate blocks: ${removedDupes}`);