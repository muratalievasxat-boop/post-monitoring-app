import { normalizeText } from './text.js';

const MAP = [
  [['госзакупки'], 'Госзакупки'],
  [['цифровизация', 'цифровое развития', 'цифровые развития', 'цифровое развитие'], 'Цифровизация'],
  [['госуслуги'], 'Госуслуги'],
  [['госслужба'], 'Госслужба'],
  [['строительство'], 'Строительство'],
  [['предпринимательство'], 'Предпринимательство'],
  [['общая', 'общее'], 'Общая'],
];

export function normalizeSphere(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();
  if (!raw) return { raw, normalized: 'Без сферы' };
  for (const [keys, label] of MAP) {
    if (keys.includes(v)) return { raw, normalized: label };
  }
  return { raw, normalized: raw.charAt(0).toUpperCase() + raw.slice(1) };
}
