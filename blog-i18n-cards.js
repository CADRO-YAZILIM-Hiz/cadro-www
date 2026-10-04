(function () {
  const language = document.documentElement.lang;
  if (!['en', 'de', 'ar'].includes(language)) return;

  const grid = document.querySelector('.blog-grid');
  if (!grid) return;

  const sourceUrl = '../blog.html';
  const dateFormatter = new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const escapeText = (value) => value.replace(/\s+/g, ' ').trim();

  const addLocalizedCards = async () => {
    const response = await fetch(sourceUrl);
    if (!response.ok) return;

    const sourceHtml = await response.text();
    const sourceDocument = new DOMParser().parseFromString(sourceHtml, 'text/html');
    const sourceCards = [...sourceDocument.querySelectorAll('.blog-card[data-publish-date]')]
      .filter((card) => card.dataset.publishDate >= '2026-10-05');

    const cards = await Promise.all(sourceCards.map(async (sourceCard) => {
      const sourceLink = sourceCard.querySelector('a.read-more');
      if (!sourceLink) return null;

      const articleResponse = await fetch(new URL(sourceLink.getAttribute('href'), window.location.href));
      if (!articleResponse.ok) return null;

      const articleDocument = new DOMParser().parseFromString(await articleResponse.text(), 'text/html');
      const alternate = [...articleDocument.querySelectorAll('link[rel="alternate"][hreflang]')]
        .find((link) => link.hreflang === language);
      if (!alternate) return null;

      const card = document.createElement('article');
      card.className = 'blog-card';
      card.style.borderLeft = '4px solid var(--cyan)';
      card.dataset.publishDate = sourceCard.dataset.publishDate;
      card.dataset.blogId = sourceCard.dataset.blogId || '';
      card.dataset.category = sourceCard.dataset.category || '';

      const title = articleDocument.querySelector('h1')?.textContent || sourceCard.querySelector('h3')?.textContent || '';
      const description = articleDocument.querySelector('meta[name="description"]')?.content || sourceCard.querySelector('p')?.textContent || '';
      const sourceDate = new Date(`${sourceCard.dataset.publishDate}T00:00:00Z`);
      const dateText = dateFormatter.format(sourceDate);

      card.innerHTML = `<div class="blog-meta">${dateText} · HR &amp; Technology · 10 min</div><h3></h3><p></p><a class="read-more"></a>`;
      card.querySelector('h3').textContent = escapeText(title);
      card.querySelector('p').textContent = escapeText(description);
      const link = card.querySelector('a');
      link.href = alternate.href;
      link.textContent = language === 'de' ? 'Artikel lesen →' : language === 'ar' ? 'اقرأ المقال →' : 'Read Article →';
      return card;
    }));

    const existingLinks = new Set([...grid.querySelectorAll('a.read-more')].map((link) => link.href));
    cards.filter(Boolean).forEach((card) => {
      const link = card.querySelector('a.read-more');
      if (!existingLinks.has(link.href)) grid.appendChild(card);
    });

    if (typeof window.filterBlogCards === 'function') window.filterBlogCards();
  };

  addLocalizedCards().catch(() => {
    // A localized card failure must not prevent the existing blog from rendering.
  });
})();
