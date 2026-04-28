/**
 * Split the raw `responsible` text field into primary + co-responsible orgs.
 *
 * Strategy:
 *  1. Split by newline → multiple parts
 *  2. If still one part, try splitting by comma
 *  3. First non-empty part = primary; rest = co (deduped)
 */
export function parseResponsible(raw) {
  if (!raw || !raw.trim()) return { primary: null, co: [], raw: raw ?? '' };

  let parts = raw.split('\n').map(s => s.trim()).filter(Boolean);

  if (parts.length === 1) {
    const commaParts = parts[0].split(',').map(s => s.trim()).filter(Boolean);
    if (commaParts.length > 1) parts = commaParts;
  }

  const [primary, ...rest] = parts;
  const co = [...new Set(rest)].filter(s => s !== primary);

  return { primary: primary ?? null, co, raw };
}
