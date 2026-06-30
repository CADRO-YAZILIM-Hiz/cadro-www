(function () {
  const monthNames = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    ocak: 1,
    subat: 2,
    şubat: 2,
    mart: 3,
    nisan: 4,
    mayis: 5,
    mayıs: 5,
    haziran: 6,
    temmuz: 7,
    ağustos: 8,
    agustos: 8,
    eylul: 9,
    eylül: 9,
    ekim: 10,
    kasim: 11,
    kasım: 11,
    aralik: 12,
    aralık: 12,
    januar: 1,
    februar: 2,
    marz: 3,
    märz: 3,
    april: 4,
    mai: 5,
    juni: 6,
    juli: 7,
    august: 8,
    september: 9,
    oktober: 10,
    november: 11,
    dezember: 12,
  };

  const normalizeToken = (token) => {
    if (!token) return '';
    return token
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const parseBlogMetaDate = (meta) => {
    if (!meta) return null;
    const text = meta.split('•')[0].trim();
    const patterns = [
      /^(\d{1,2})\.\s*([^\d,]+)\s+(\d{4})$/,
      /^(\d{1,2})\s+([^\d,]+)\s+(\d{4})$/,
      /^([^\d,]+)\s+(\d{1,2}),\s*(\d{4})$/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      let day;
      let monthText;
      let year;

      if (pattern === patterns[0] || pattern === patterns[1]) {
        day = match[1];
        monthText = match[2];
        year = match[3];
      } else {
        monthText = match[1];
        day = match[2];
        year = match[3];
      }

      const month = monthNames[normalizeToken(monthText)];
      if (!month) continue;

      const parsedDay = Number(day);
      const parsedYear = Number(year);
      if (!parsedDay || !parsedYear) continue;

      const date = new Date(parsedYear, month - 1, parsedDay);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    return null;
  };

  const parseBlogDate = (card) => {
    const publishDate = card.dataset.publishDate;
    if (publishDate) {
      const date = new Date(publishDate);
      if (!Number.isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }
    return parseBlogMetaDate(card.querySelector('.blog-meta')?.textContent || '');
  };

  const getCardKey = (card) => {
    const anchor = card.querySelector('a.read-more');
    if (anchor) {
      try {
        const url = new URL(anchor.getAttribute('href') || '', window.location.origin);
        return `${url.pathname}${url.search}${url.hash}`;
      } catch (error) {
        return anchor.getAttribute('href') || '';
      }
    }
    return card.querySelector('h3')?.textContent?.trim() || '';
  };

  const filterAndSortBlogCards = () => {
    if (document.body.dataset.page !== 'blog') return;
    const grid = document.querySelector('.blog-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.blog-card'));
    if (!cards.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seenKeys = new Set();
    const rows = [];

    cards.forEach((card, index) => {
      const key = getCardKey(card);
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);

      const date = parseBlogDate(card);
      rows.push({ card, date, index });
    });

    const visible = rows.filter(({ date }) => !date || date <= today);

    visible.sort((a, b) => {
      if (a.date && b.date) return b.date - a.date;
      if (a.date) return -1;
      if (b.date) return 1;
      const titleA = a.card.querySelector('h3')?.textContent?.trim() || '';
      const titleB = b.card.querySelector('h3')?.textContent?.trim() || '';
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' }) || a.index - b.index;
    });

    grid.replaceChildren(...visible.map((entry) => entry.card));
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', filterAndSortBlogCards);
  } else {
    filterAndSortBlogCards();
  }
})();
