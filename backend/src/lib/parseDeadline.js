const QUARTER_END = ['03-31', '06-30', '09-30', '12-31'];

const MONTH_MAP = {
  'январ': '01', 'феврал': '02', 'март': '03', 'апрел': '04',
  'мая': '05',   'мае': '05',   'июн': '06',  'июл': '07',
  'август': '08', 'сентябр': '09', 'октябр': '10', 'ноябр': '11', 'декабр': '12',
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4 };

/**
 * Parse a raw deadline string → ISO date (last day of the period).
 * @param {string|null} raw
 * @returns {string|null} 'YYYY-MM-DD' or null if unparseable
 */
export function parseDeadline(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const s = raw.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Normalize Ukrainian Cyrillic look-alikes to Latin (І→i, ї→i)
    .replace(/і/g, 'i')
    .replace(/ї/g, 'i');

  if (!s) return null;

  // 1. "N квартал YYYY" or "roman квартал YYYY"
  //    iv must precede i{1,3} to avoid partial match
  const q = s.match(/(1|2|3|4|iv|i{1,3})\s+квартал\s+(\d{4})/);
  if (q) {
    const qNum = ROMAN[q[1]] ?? parseInt(q[1], 10);
    if (qNum >= 1 && qNum <= 4) return `${q[2]}-${QUARTER_END[qNum - 1]}`;
    // invalid quarter (e.g. "6 квартал") — fall through to year-only patterns
  }

  // 2. "[1|2|перв|втор] пол*** YYYY"  (tolerates "полгуодие" typo via пол\S+)
  //    \S instead of \w because \w doesn't match Cyrillic in JS
  const h = s.match(/([12]|перв\S*|втор\S*)\s+пол\S+\s+(\d{4})/);
  if (h) {
    const isFirst = h[1] === '1' || h[1].startsWith('перв');
    return `${h[2]}-${isFirst ? '06-30' : '12-31'}`;
  }

  // 3. Exact date "до DD месяц YYYY"
  const ex = s.match(/до\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
  if (ex) {
    const mKey = Object.keys(MONTH_MAP).find(k => ex[2].startsWith(k));
    if (mKey) return `${ex[3]}-${MONTH_MAP[mKey]}-${ex[1].padStart(2, '0')}`;
  }

  // 4. "конец/конца/конц/до конца YYYY"  (tolerates "конц" typo)
  const ke = s.match(/(?:до\s+)?кон[еэ]?ц[а]?\s+(\d{4})/);
  if (ke) return `${ke[1]}-12-31`;

  // 5. "YYYY год" / "YYYY года"
  const yw = s.match(/(\d{4})\s+год/);
  if (yw) return `${yw[1]}-12-31`;

  // 6. Bare four-digit year  "2024"
  const by = s.match(/^(\d{4})$/);
  if (by) return `${by[1]}-12-31`;

  return null;
}
