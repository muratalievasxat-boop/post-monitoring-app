import crypto from 'crypto';
import { normalizeText } from '../normalizers/text.js';

export function buildRecordHash(row) {
  const source = [
    normalizeText(row.cycle).toLowerCase(),
    normalizeText(row.sphere_normalized || row.sphere_raw).toLowerCase(),
    normalizeText(row.proposal_text).toLowerCase(),
    normalizeText(row.responsible_org).toLowerCase()
  ].join('|');
  return crypto.createHash('sha256').update(source).digest('hex');
}
