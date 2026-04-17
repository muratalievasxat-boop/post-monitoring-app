import { normalizeText } from './text.js';

export function normalizeStatus(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();

  if (!raw) return { raw, normalized: 'Без статуса', group: 'unknown' };
  if (v.includes('исполн')) return { raw, normalized: 'Исполнено', group: 'done' };
  if (v.includes('в работе')) return { raw, normalized: 'В работе', group: 'active' };
  if (v.includes('не поддерж')) return { raw, normalized: 'Не поддерживается', group: 'rejected' };
  if (v.includes('исключ')) return { raw, normalized: 'Исключить', group: 'excluded' };

  return { raw, normalized: raw, group: 'unknown' };
}
