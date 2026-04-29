// Thin re-export so the import-worker doesn't depend on the backend package path.
// Duplicate of backend/src/lib/parseDeadline.js — keep in sync.

const QUARTER_END = ['03-31', '06-30', '09-30', '12-31'];

const MONTH_MAP = {
  'январ': '01', 'феврал': '02', 'март': '03', 'апрел': '04',
  'мая': '05',   'мае': '05',   'июн': '06',  'июл': '07',
  'август': '08', 'сентябр': '09', 'октябр': '10', 'ноябр': '11', 'декабр': '12',
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4 };

export function parseDeadline(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const s = raw.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/і/g, 'i')
    .replace(/ї/g, 'i');

  if (!s) return null;

  const q = s.match(/(1|2|3|4|iv|i{1,3})\s+квартал\s+(\d{4})/);
  if (q) {
    const qNum = ROMAN[q[1]] ?? parseInt(q[1], 10);
    if (qNum >= 1 && qNum <= 4) return `${q[2]}-${QUARTER_END[qNum - 1]}`;
  }

  const h = s.match(/([12]|перв\S*|втор\S*)\s+пол\S+\s+(\d{4})/);
  if (h) {
    const isFirst = h[1] === '1' || h[1].startsWith('перв');
    return `${h[2]}-${isFirst ? '06-30' : '12-31'}`;
  }

  const ex = s.match(/до\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
  if (ex) {
    const mKey = Object.keys(MONTH_MAP).find(k => ex[2].startsWith(k));
    if (mKey) return `${ex[3]}-${MONTH_MAP[mKey]}-${ex[1].padStart(2, '0')}`;
  }

  const ke = s.match(/(?:до\s+)?кон[еэ]?ц[а]?\s+(\d{4})/);
  if (ke) return `${ke[1]}-12-31`;

  const yw = s.match(/(\d{4})\s+год/);
  if (yw) return `${yw[1]}-12-31`;

  const by = s.match(/^(\d{4})$/);
  if (by) return `${by[1]}-12-31`;

  return null;
}
