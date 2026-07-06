export const getNumberLocale = (language = 'tr') => {
  if (language === 'ar') return 'ar-u-nu-arab';
  if (language === 'de') return 'de-DE';
  if (language === 'en') return 'en-US';
  return 'tr-TR';
};

export const localizeDigits = (value, language = 'tr', options = {}) => {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return new Intl.NumberFormat(getNumberLocale(language), {
      useGrouping: false,
      ...options,
    }).format(numericValue);
  }

  if (language !== 'ar') return String(value);

  const digitMap = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩',
  };

  return String(value).replace(/\d/g, (digit) => digitMap[digit] || digit);
};
