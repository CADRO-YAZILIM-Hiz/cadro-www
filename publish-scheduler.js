/**
 * publish-scheduler.js
 * Daily blog publish scheduler — runs via GitHub Actions (daily-blog-publish.yml)
 *
 * Purpose:
 * 1. Parse blog.html and extract all blog cards with data-publish-date
 * 2. Identify posts whose publish date is today or earlier
 * 3. Log a summary of what is scheduled / newly visible today
 * 4. Exit 0 → no changes (nothing new today)
 *    Exit 1 → changes detected (new post(s) became visible today) → triggers commit
 *
 * The actual visibility filtering happens client-side in blog-schedule.js.
 * This script serves as the server-side "heartbeat" that can trigger a redeploy
 * when new content becomes due, ensuring fresh caches and updated timestamps.
 */

const fs = require('fs');
const path = require('path');

const BLOG_PATH = path.join(__dirname, 'blog.html');

function parseBlogCards(html) {
  const cards = [];
  // Match each blog-card article, capturing data-publish-date, blog-meta text, and blog-id
  const cardRegex = /<article\s+class="blog-card"[^>]*data-publish-date="([^"]*)"[^>]*data-blog-id="([^"]*)"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const publishDate = match[1];
    const blogId = match[2];
    const cardHtml = match[3];

    // Extract blog-meta text
    const metaMatch = cardHtml.match(/<div\s+class="blog-meta"[^>]*>([^<]*)<\/div>/i);
    const metaText = metaMatch ? metaMatch[1].trim() : '';

    // Extract title
    const titleMatch = cardHtml.match(/<h3[^>]*>([^<]*)<\/h3>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract link
    const linkMatch = cardHtml.match(/<a\s+href="([^"]*)"[^>]*class="read-more"/i);
    const link = linkMatch ? linkMatch[1] : '';

    cards.push({ publishDate, blogId, metaText, title, link });
  }

  return cards;
}

function getTodayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function main() {
  if (!fs.existsSync(BLOG_PATH)) {
    console.error(`ERROR: ${BLOG_PATH} not found.`);
    process.exit(1);
  }

  let html;
  try {
    html = fs.readFileSync(BLOG_PATH, 'utf-8');
  } catch (err) {
    console.error(`ERROR: Cannot read ${BLOG_PATH}: ${err.message}`);
    process.exit(1);
  }

  const cards = parseBlogCards(html);
  const today = getTodayDateStr();

  console.log(`=== Daily Blog Publish Scheduler ===`);
  console.log(`Today: ${today}`);
  console.log(`Total blog cards found: ${cards.length}\n`);

  // Group cards by status
  const published = cards.filter(c => c.publishDate <= today);
  const scheduled = cards.filter(c => c.publishDate > today);

  console.log(`--- Published (date ≤ today): ${published.length} posts ---`);
  published.forEach(c => {
    console.log(`  ✅ [${c.publishDate}] ${c.title}`);
  });

  console.log(`\n--- Scheduled (future): ${scheduled.length} posts ---`);
  scheduled.forEach(c => {
    console.log(`  ⏳ [${c.publishDate}] ${c.title}`);
  });

  // Cards going live today
  const todayCards = cards.filter(c => c.publishDate === today);
  console.log(`\n--- Going live TODAY: ${todayCards.length} post(s) ---`);
  todayCards.forEach(c => {
    console.log(`  🚀 [${c.publishDate}] ${c.title}`);
    console.log(`     Link: ${c.link}`);
    console.log(`     Meta: ${c.metaText}`);
  });

  console.log(`\n=== Summary ===`);
  console.log(`Published: ${published.length}`);
  console.log(`Scheduled (future): ${scheduled.length}`);
  console.log(`New today: ${todayCards.length}`);

  // Always exit 0 — this is a reporting script.
  // The blog visibility is handled client-side by blog-schedule.js.
  // We exit 0 so the workflow step doesn't fail.
  console.log(`\nDone.`);
  process.exit(0);
}

main();