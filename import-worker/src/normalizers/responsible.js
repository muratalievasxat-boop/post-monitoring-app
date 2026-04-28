export function parseResponsible(raw) {
  if (!raw || !raw.trim()) return { primary: null, co: [] };

  let parts = raw.split('\n').map(s => s.trim()).filter(Boolean);

  if (parts.length === 1) {
    const commaParts = parts[0].split(',').map(s => s.trim()).filter(Boolean);
    if (commaParts.length > 1) parts = commaParts;
  }

  const [primary, ...rest] = parts;
  const co = [...new Set(rest)].filter(s => s !== primary);

  return { primary: primary ?? null, co };
}
